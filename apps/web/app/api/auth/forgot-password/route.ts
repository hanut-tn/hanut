import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPasswordResetEmail } from '@/lib/email'

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Email invalide').max(254),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers)
  const { allowed } = await checkRateLimit(ip, 'auth_forgot_password', 5, 10).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = ForgotPasswordSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Email invalide' },
      { status: 400 }
    )
  }

  const email = parsed.data.email.toLowerCase()
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: buildAuthCallbackUrl('/reset-password', request.nextUrl.origin),
    },
  })

  if (error || !data?.properties?.action_link) {
    Sentry.captureException(new Error(`forgot-password generateLink: ${error?.message ?? 'missing action link'}`), {
      tags: { module: 'forgot_password', action: 'generate_link' },
    })
    // Ne pas révéler si l'email existe ou non.
    return NextResponse.json({ success: true })
  }

  try {
    await sendPasswordResetEmail({
      to: email,
      resetUrl: data.properties.action_link,
    })
  } catch (emailError) {
    Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
      tags: { module: 'forgot_password', action: 'send_email' },
    })
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de réinitialisation. Réessayez." },
      { status: 503 }
    )
  }

  return NextResponse.json({ success: true })
}
