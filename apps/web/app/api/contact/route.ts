import * as Sentry from '@sentry/nextjs'
import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { sendContactMessageNotification } from '@/lib/email'
import { HANUT_CONTACT } from '@/lib/constants'

const ContactSchema = z.object({
  name:            z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(100, 'Le nom est trop long.'),
  email:           z.string().trim().email('Adresse email invalide.'),
  message:         z.string().trim().min(10, 'Le message doit contenir au moins 10 caractères.').max(2000, 'Le message est trop long (2000 caractères maximum).'),
  turnstile_token: z.string().optional(),
})

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  let rl: RateLimitResult

  try {
    rl = await checkRateLimit(ip, 'contact', 3, 1)
  } catch {
    return NextResponse.json(
      { error: 'Protection anti-spam indisponible. Réessayez dans quelques minutes.' },
      { status: 503 }
    )
  }

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = ContactSchema.safeParse(rawBody)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { name, email, message, turnstile_token } = parsed.data

  const turnstileOk = await verifyTurnstileToken(turnstile_token ?? '', ip)
  if (!turnstileOk) {
    return NextResponse.json(
      { error: 'Vérification de sécurité échouée. Rechargez la page et réessayez.' },
      { status: 400 }
    )
  }
  const supabase = createServiceClient()
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedMessage = message.trim()

  const { error } = await supabase.from('contact_messages').insert({
    name: trimmedName,
    email: trimmedEmail,
    message: trimmedMessage,
  })
  if (error) {
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
  }

  // Le message est déjà en base (source de vérité, consultable sur /admin) —
  // un échec d'envoi de la notification ne doit pas faire échouer la requête.
  // after() garde la fonction serverless active le temps de l'envoi : sans
  // ça, Vercel peut geler l'exécution dès la réponse renvoyée et tuer la
  // requête Resend en plein vol (fire-and-forget non fiable en serverless).
  after(() =>
    sendContactMessageNotification({
      to: HANUT_CONTACT.email,
      name: trimmedName,
      fromEmail: trimmedEmail,
      message: trimmedMessage,
    }).catch(err => {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: { module: 'contact', action: 'notify_team' },
      })
    })
  )

  return NextResponse.json({ message: 'Message envoyé !' })
}
