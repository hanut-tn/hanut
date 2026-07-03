import * as Sentry from '@sentry/nextjs'
import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAuthCallbackUrl, buildAuthEmailActionUrl } from '@/lib/auth-redirect'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/service'
import { sendSignupConfirmationEmail } from '@/lib/email'

const ResendConfirmationSchema = z.object({
  email: z.string().trim().email('Email invalide').max(254, 'Adresse email trop longue.'),
})

async function findAuthUserByEmail(
  admin: ReturnType<typeof createServiceClient>['auth']['admin'],
  email: string,
): Promise<User | null> {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find(user => user.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 1000) return null
  }
  return null
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers)
  const { allowed } = await checkRateLimit(ip, 'auth_resend_confirmation', 3, 10).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = ResendConfirmationSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Email invalide' },
      { status: 400 }
    )
  }

  const email = parsed.data.email.toLowerCase()
  const serviceClient = createServiceClient()

  let user: User | null = null
  try {
    user = await findAuthUserByEmail(serviceClient.auth.admin, email)
  } catch (error) {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { module: 'resend_confirmation', action: 'find_user' },
    })
    return NextResponse.json({ success: true })
  }

  const isHanutSignup = user?.user_metadata?.hanut_signup === true
  const isConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)
  if (!user || !isHanutSignup || isConfirmed) {
    return NextResponse.json({ success: true })
  }

  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: buildAuthCallbackUrl('/dashboard', request.nextUrl.origin),
    },
  })

  if (error || !data?.properties?.hashed_token) {
    Sentry.captureException(new Error(`resend confirmation generateLink: ${error?.message ?? 'missing hashed token'}`), {
      tags: { module: 'resend_confirmation', action: 'generate_link' },
    })
    return NextResponse.json({ success: true })
  }

  try {
    await sendSignupConfirmationEmail({
      to: email,
      name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null,
      confirmationUrl: buildAuthEmailActionUrl({
        tokenHash: data.properties.hashed_token,
        type: 'magiclink',
        nextPath: '/dashboard',
      }, request.nextUrl.origin),
    })
  } catch (emailError) {
    Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
      tags: { module: 'resend_confirmation', action: 'send_email' },
    })
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de confirmation. Réessayez." },
      { status: 503 }
    )
  }

  return NextResponse.json({ success: true })
}
