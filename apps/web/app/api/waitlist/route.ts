import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

const WaitlistSchema = z.object({
  email:           z.string().email(),
  turnstile_token: z.string().optional(),
})

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  let rl: RateLimitResult

  try {
    rl = await checkRateLimit(ip, 'waitlist', 3, 60)
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

  const parsed = WaitlistSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstile_token ?? '', ip)
  if (!turnstileOk) {
    return NextResponse.json(
      { error: 'Vérification de sécurité échouée. Rechargez la page et réessayez.' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('waitlist').insert({ email: parsed.data.email.trim().toLowerCase() })
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Déjà inscrit !' })
    }
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 })
  }
  return NextResponse.json({ message: 'Inscrit avec succès !' })
}
