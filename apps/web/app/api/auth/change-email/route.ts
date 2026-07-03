import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmailChangeCurrentEmail, sendEmailChangeNewEmail } from '@/lib/email'

const ChangeEmailSchema = z.object({
  email: z.string().trim().email('Email invalide').max(254),
})

export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  }

  const ip = getClientIp(request.headers)
  const { allowed } = await checkRateLimit(ip, 'auth_email_change', 5, 10).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = ChangeEmailSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Email invalide' },
      { status: 400 }
    )
  }

  const currentEmail = user.email.trim().toLowerCase()
  const newEmail = parsed.data.email.toLowerCase()
  if (newEmail === currentEmail) {
    return NextResponse.json({ error: 'Cette adresse est déjà votre email actuel.' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const redirectTo = buildAuthCallbackUrl('/dashboard', request.nextUrl.origin)
  const [{ data: currentLink, error: currentError }, { data: newLink, error: newError }] = await Promise.all([
    serviceClient.auth.admin.generateLink({
      type: 'email_change_current',
      email: currentEmail,
      newEmail,
      options: { redirectTo },
    }),
    serviceClient.auth.admin.generateLink({
      type: 'email_change_new',
      email: currentEmail,
      newEmail,
      options: { redirectTo },
    }),
  ])

  if (
    currentError ||
    newError ||
    !currentLink?.properties?.action_link ||
    !newLink?.properties?.action_link
  ) {
    Sentry.captureException(new Error(`email change generateLink: ${currentError?.message ?? newError?.message ?? 'missing action link'}`), {
      tags: { module: 'change_email', action: 'generate_link' },
    })
    return NextResponse.json({ error: "Impossible de préparer le changement d'email." }, { status: 500 })
  }

  try {
    await Promise.all([
      sendEmailChangeCurrentEmail({
        to: currentEmail,
        newEmail,
        confirmationUrl: currentLink.properties.action_link,
      }),
      sendEmailChangeNewEmail({
        to: newEmail,
        confirmationUrl: newLink.properties.action_link,
      }),
    ])
  } catch (emailError) {
    Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
      tags: { module: 'change_email', action: 'send_email' },
    })
    return NextResponse.json(
      { error: "Impossible d'envoyer les emails de confirmation. Réessayez." },
      { status: 503 }
    )
  }

  return NextResponse.json({ success: true })
}
