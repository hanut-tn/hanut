import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { buildAuthCallbackUrl, buildAuthEmailActionUrl } from '@/lib/auth-redirect'
import { sendSignupConfirmationEmail } from '@/lib/email'

const PASSWORD_ERROR = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'

const RegisterSchema = z.object({
  shop_name: z.string().min(2, 'Nom trop court').max(100),
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
  terms_accepted: z.boolean().refine(v => v === true, 'Vous devez accepter les CGU pour continuer.'),
})

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

  const serviceClient = createServiceClient()
  const { data, error: signUpError } = await serviceClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: buildAuthCallbackUrl('/dashboard', req.nextUrl.origin),
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

  // Sécurité : generateLink({type:'signup'}) peut, pour un email déjà
  // enregistré, renvoyer l'utilisateur EXISTANT sans lever d'erreur
  // "user already registered" détectable (message exact dépendant de la
  // version de Supabase). S'il est déjà confirmé, ce n'est pas un compte
  // fraîchement créé par cette requête : ne jamais le laisser atteindre
  // les branches de nettoyage plus bas, qui suppriment le compte Auth en
  // cas d'échec — ça supprimerait le compte d'un client existant.
  if (data.user.email_confirmed_at) {
    return NextResponse.json(
      { error: 'Un compte existe déjà avec cet email. Connectez-vous.' },
      { status: 409 }
    )
  }

  const tokenHash = data.properties?.hashed_token
  if (!tokenHash) {
    await serviceClient.auth.admin.deleteUser(data.user.id).catch(deleteErr => {
      Sentry.captureException(deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)), {
        tags: { module: 'auth_register', action: 'orphan_user_cleanup' },
        extra: { userId: data.user?.id },
      })
    })
    Sentry.captureException(new Error('signup generateLink: missing hashed token'), {
      tags: { module: 'auth_register', action: 'confirmation_email' },
    })
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de confirmation. Réessayez." },
      { status: 503 }
    )
  }

  try {
    await sendSignupConfirmationEmail({
      to: email,
      name: shop_name,
      confirmationUrl: buildAuthEmailActionUrl({
        tokenHash,
        type: 'signup',
        nextPath: '/dashboard',
      }, req.nextUrl.origin),
    })
  } catch (emailError) {
    await serviceClient.auth.admin.deleteUser(data.user.id).catch(deleteErr => {
      Sentry.captureException(deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)), {
        tags: { module: 'auth_register', action: 'orphan_user_cleanup' },
        extra: { userId: data.user?.id },
      })
    })
    Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
      tags: { module: 'auth_register', action: 'confirmation_email' },
    })
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de confirmation. Réessayez." },
      { status: 503 }
    )
  }

  return NextResponse.json({
    success: true,
    session: null,
  })
}
