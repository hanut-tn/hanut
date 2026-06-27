import * as Sentry from '@sentry/nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'
import { ensureSignupSellerProfile } from '@/lib/signup-profile'

const PASSWORD_ERROR = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'

const RegisterSchema = z.object({
  shop_name: z.string().min(2, 'Nom de boutique trop court').max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().max(30).optional(),
  password: z.string().superRefine((val, ctx) => {
    if (
      val.length < 8 ||
      !/[A-Z]/.test(val) ||
      !/[0-9]/.test(val) ||
      !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(val)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PASSWORD_ERROR })
    }
  }),
  turnstile_token: z.string().optional(),
})

function publicAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)

  const { allowed } = await checkRateLimit(ip, 'auth_register', 5, 1).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429 }
    )
  }

  const rawBody = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(rawBody)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { shop_name, email, phone, password, turnstile_token } = parsed.data
  const turnstileOk = await verifyTurnstileToken(turnstile_token ?? '', ip)
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Vérification anti-spam échouée. Réessayez.' }, { status: 400 })
  }

  const authClient = publicAuthClient()
  const { data, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl('/dashboard', req.nextUrl.origin),
      data: { name: shop_name, phone: phone ?? '', hanut_signup: true },
    },
  })

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('email rate limit')) {
      return NextResponse.json(
        { error: 'Trop de comptes créés récemment. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }
    if (signUpError.message.toLowerCase().includes('user already registered')) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email. Connectez-vous.' },
        { status: 409 }
      )
    }
    Sentry.captureException(new Error(signUpError.message), {
      tags: { module: 'auth_register', action: 'sign_up' },
    })
    return NextResponse.json(
      { error: 'Impossible de créer le compte. Réessayez ou contactez le support.' },
      { status: 400 }
    )
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  // Avec la confirmation email activée, Supabase crée seulement l'utilisateur
  // Auth en attente et renvoie session=null. La boutique Hanut est créée après
  // le clic dans l'email, dans /api/auth/callback.
  if (data.session) {
    const serviceClient = createServiceClient()
    const profile = await ensureSignupSellerProfile(serviceClient, {
      userId: data.user.id,
      email,
      shopName: shop_name,
      phone,
    })

    if (!profile.ok) {
      if (profile.duplicateEmail) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email. Vérifiez votre boîte mail ou connectez-vous.' },
          { status: 409 }
        )
      }
      const orphanUserId = data.user!.id
      await serviceClient.auth.admin.deleteUser(orphanUserId).catch(deleteErr => {
        Sentry.captureException(deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)), {
          tags: { module: 'auth_register', action: 'orphan_user_cleanup' },
          extra: { userId: orphanUserId },
        })
      })
      Sentry.captureException(new Error(profile.error), {
        tags: { module: 'auth_register', action: 'seller_insert' },
      })
      return NextResponse.json({ error: 'Impossible de créer le profil. Réessayez.' }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  })
}
