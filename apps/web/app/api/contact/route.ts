import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

const ContactSchema = z.object({
  name:            z.string().min(2).max(100),
  email:           z.string().email(),
  message:         z.string().min(10).max(2000),
  turnstile_token: z.string().optional(),
})

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  let rl: RateLimitResult

  try {
    rl = await checkRateLimit(ip, 'contact', 5, 60)
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
  const { error } = await supabase.from('contact_messages').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
  })
  if (error) {
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
  }
  return NextResponse.json({ message: 'Message envoyé !' })
}
