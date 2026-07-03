import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, after } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureSignupSellerProfile, isConfirmedHanutSignupUser } from '@/lib/signup-profile'
import { sendWelcomeEmail } from '@/lib/email'

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value as EmailOtpType)
}

function isSafeRedirect(path: string | null): boolean {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.startsWith('/\\')) return false
  if (path.includes(':')) return false
  if (path.includes('@')) return false
  try {
    const url = new URL(path, 'http://localhost')
    return url.hostname === 'localhost'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next')
  const redirectPath = isSafeRedirect(next) ? next! : '/dashboard'

  if (code || tokenHash) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list: { name: string; value: string; options?: object }[]) =>
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never)),
        },
      }
    )

    let verifyError: Error | null = null
    let verifiedUser: {
      id?: string
      email?: string
      email_confirmed_at?: string | null
      confirmed_at?: string | null
      user_metadata?: Record<string, unknown>
      created_at?: string
    } | null = null

    if (tokenHash && isEmailOtpType(type)) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      verifyError = error
      verifiedUser = data?.user ?? null
    } else if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      verifyError = error
      verifiedUser = data?.user ?? null
    } else {
      verifyError = new Error('Type de lien invalide')
    }

    if (verifyError) {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('auth_error', 'invalid_or_expired_link')
      return NextResponse.redirect(loginUrl)
    }

    if (!verifiedUser?.id) {
      const { data } = await supabase.auth.getUser()
      verifiedUser = data.user ?? verifiedUser
    }

    // isConfirmedHanutSignupUser() a un chemin de repli qui matche tout compte
    // vendeur déjà confirmé (email confirmé + nom renseigné). Sans filtre sur
    // `type`, un lien de reset password ou de changement d'email pour un compte
    // existant matchait aussi ce repli et était traité à tort comme une
    // confirmation d'inscription (mauvaise redirection vers /verify-email,
    // email de bienvenue renvoyé en double). On restreint donc ce repli aux
    // seuls cas où le lien est réellement lié à une inscription :
    // - type === 'signup' : première confirmation (lien app custom)
    // - type === 'magiclink' : renvoi de confirmation (lien app custom)
    // - type === null (flux ?code=, sans `type` dans l'URL) : ancien lien
    //   natif Supabase / template de secours, seul cas où on n'a aucun
    //   moyen de connaître le type autrement que par l'heuristique.
    // 'recovery' et 'email_change' ont toujours un `type` explicite dans nos
    // liens et ne doivent donc jamais retomber sur ce repli.
    const isSignupConfirmation =
      type === 'signup' ||
      ((type === 'magiclink' || type === null) && verifiedUser ? isConfirmedHanutSignupUser(verifiedUser) : false)

    if (verifiedUser?.id && verifiedUser.email && isSignupConfirmation) {
      const serviceClient = createServiceClient()
      const profile = await ensureSignupSellerProfile(serviceClient, {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        shopName: verifiedUser.user_metadata?.name,
        phone: verifiedUser.user_metadata?.phone,
      })

      if (!profile.ok) {
        Sentry.captureException(new Error(profile.error), {
          tags: { module: 'auth_callback', action: 'seller_profile' },
          extra: {
            duplicateEmail: Boolean(profile.duplicateEmail),
            userId: verifiedUser.id,
            email: verifiedUser.email,
          },
        })
        const verifyUrl = new URL('/verify-email', requestUrl.origin)
        verifyUrl.searchParams.set('confirmed', '1')
        verifyUrl.searchParams.set('setup_error', '1')
        if (verifiedUser.email) verifyUrl.searchParams.set('email', verifiedUser.email)
        return NextResponse.redirect(verifyUrl)
      }

      const name = verifiedUser.user_metadata?.name as string | undefined
      const welcomeEmail = verifiedUser.email
      // after() garde la fonction serverless active le temps de l'envoi :
      // sans ça, Vercel peut geler l'exécution dès la redirection renvoyée
      // et tuer la requête Resend en plein vol (fire-and-forget non fiable
      // en serverless).
      after(() =>
        sendWelcomeEmail({ to: welcomeEmail, name }).catch(err => {
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
            tags: { module: 'auth_callback', action: 'welcome_email' },
            extra: { hasEmail: Boolean(welcomeEmail) },
          })
        })
      )
    }

    if (isSignupConfirmation) {
      const verifyUrl = new URL('/verify-email', requestUrl.origin)
      verifyUrl.searchParams.set('confirmed', '1')
      return NextResponse.redirect(verifyUrl)
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
