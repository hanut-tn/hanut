import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureSignupSellerProfile } from '@/lib/signup-profile'

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return char
    }
  })
}

async function sendWelcomeEmail(email: string, name: string | undefined) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hanut.tn'
  const logoUrl = `${appUrl}/icon-512.png`
  const safeName = name ? escapeHtml(name.trim().slice(0, 100)) : ''
  const shopName = safeName ? ` ${safeName}` : ''

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'Hanut <noreply@hanut.tn>',
      to: email,
      subject: 'Bienvenue sur Hanut 🎉',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F4;padding:40px 16px">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

                <!-- Header vert -->
                <tr>
                  <td style="background:#16A34A;padding:32px 40px;text-align:center">
                    <img src="${logoUrl}" alt="Hanut" width="56" height="56"
                         style="display:block;margin:0 auto 16px;border-radius:12px;background:#fff;padding:4px" />
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px">
                      Bienvenue sur Hanut${shopName ? ` 👋` : ' 🎉'}
                    </h1>
                  </td>
                </tr>

                <!-- Corps -->
                <tr>
                  <td style="padding:32px 40px">
                    <p style="margin:0 0 16px;color:#1C1917;font-size:16px;line-height:1.6">
                      ${shopName ? `Votre boutique<strong>${shopName}</strong> est maintenant active.` : 'Votre compte est maintenant actif.'}
                      Bienvenue dans la communauté Hanut !
                    </p>

                    <p style="margin:0 0 24px;color:#57534E;font-size:15px;line-height:1.6">
                      Hanut vous permet de <strong>gérer vos commandes WhatsApp et Instagram</strong> depuis
                      un tableau de bord simple — sans comptable, sans tableur, sans prise de tête.
                    </p>

                    <!-- Box essai -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
                      <tr>
                        <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px 24px">
                          <p style="margin:0 0 4px;color:#14532D;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">
                            Essai gratuit
                          </p>
                          <p style="margin:0;color:#15803D;font-size:15px;font-weight:500">
                            Vous bénéficiez de <strong>14 jours d'essai Pro gratuit</strong> — toutes les
                            fonctionnalités débloquées, sans carte bancaire.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}/dashboard"
                             style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:600;
                                    text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-.1px">
                            Accéder à mon tableau de bord →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <hr style="border:none;border-top:1px solid #E7E5E4;margin:0 0 24px" />

                    <p style="margin:0;color:#78716C;font-size:13px;line-height:1.5">
                      Une question ? Répondez directement à cet email ou contactez-nous sur
                      <a href="${appUrl}/contact" style="color:#16A34A">hanut.tn/contact</a>.<br/>
                      L'équipe Hanut
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    }),
    signal: AbortSignal.timeout(8_000),
  })

  if (!response.ok) {
    throw new Error(`Welcome email failed with status ${response.status}`)
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
    let verifiedUser: { id?: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string } | null = null

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

    // Email de bienvenue pour les nouvelles inscriptions confirmées.
    // Critères : destination = /dashboard + compte créé il y a moins d'1h.
    const isSignupType = type === 'signup'
    const isRecentAccount = verifiedUser?.created_at
      ? Date.now() - new Date(verifiedUser.created_at).getTime() < 60 * 60 * 1000
      : false

    const isSignupConfirmation = isSignupType || (redirectPath === '/dashboard' && isRecentAccount)

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
          extra: { duplicateEmail: Boolean(profile.duplicateEmail) },
        })
        const verifyUrl = new URL('/verify-email', requestUrl.origin)
        verifyUrl.searchParams.set('confirmed', '1')
        verifyUrl.searchParams.set('setup_error', '1')
        return NextResponse.redirect(verifyUrl)
      }

      const name = verifiedUser.user_metadata?.name as string | undefined
      sendWelcomeEmail(verifiedUser.email, name).catch(err => {
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: { module: 'auth_callback', action: 'welcome_email' },
          extra: { hasEmail: Boolean(verifiedUser?.email) },
        })
      })
    }

    if (isSignupConfirmation) {
      const verifyUrl = new URL('/verify-email', requestUrl.origin)
      verifyUrl.searchParams.set('confirmed', '1')
      return NextResponse.redirect(verifyUrl)
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
