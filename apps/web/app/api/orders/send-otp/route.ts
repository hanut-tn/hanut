import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { sendOrderOtpEmail } from '@/lib/email'
import {
  generateOrderOtp,
  hashOrderOtp,
  normalizeOtpEmail,
  normalizeOtpSlug,
  otpRateLimitIdentifier,
} from '@/lib/order-otp'

const SendOtpSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  turnstile_token: z.string(),
})

function getRequiredTurnstileToken(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const token = (body as { turnstile_token?: unknown }).turnstile_token
  return typeof token === 'string' && token.trim() ? token : null
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) {
    return noStoreJson({ error: 'Origine non autorisée.' }, 403)
  }

  const rawBody = await request.json().catch(() => null)
  const ip = getClientIp(request.headers)
  const turnstileToken = getRequiredTurnstileToken(rawBody)
  if (!turnstileToken) {
    return noStoreJson({ error: 'Vérification de sécurité requise' }, 400)
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip)
  if (!turnstileOk) {
    return noStoreJson({ error: 'Vérification anti-spam échouée. Réessayez.' }, 403)
  }

  const parsed = SendOtpSchema.safeParse(rawBody)
  if (!parsed.success) {
    return noStoreJson({ error: 'Adresse email ou boutique invalide.' }, 400)
  }

  const slug = normalizeOtpSlug(parsed.data.slug)
  const email = normalizeOtpEmail(parsed.data.email)

  try {
    const ipLimit = await checkRateLimit(ip, 'send_otp_ip', 3, 10)
    if (!ipLimit.allowed) {
      return noStoreJson({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429)
    }
  } catch (error) {
    console.error('[send-otp] rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
  }

  try {
    const recipientLimit = await checkRateLimit(
      otpRateLimitIdentifier(slug, email),
      'send_otp_recipient',
      1,
      1,
    )
    if (!recipientLimit.allowed) {
      return noStoreJson(
        { error: 'Un code vient déjà d’être envoyé. Réessayez dans une minute.' },
        429,
      )
    }
  } catch (error) {
    console.error('[send-otp] recipient rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey && process.env.NODE_ENV === 'production') {
    console.error('[send-otp] RESEND_API_KEY is missing in production.')
    return noStoreJson({ error: 'Envoi d’email temporairement indisponible.' }, 503)
  }

  const supabase = createServiceClient()
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, name, subscription_end')
    .eq('slug', slug)
    .single()

  if (sellerError || !seller) {
    return noStoreJson({ error: 'Boutique introuvable.' }, 404)
  }

  if (seller.subscription_end && new Date(seller.subscription_end) < new Date()) {
    return noStoreJson({ error: 'Cette boutique n’accepte plus de commandes.' }, 403)
  }

  const code = generateOrderOtp()
  const codeHash = hashOrderOtp(code, slug, email)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: insertedOtp, error: insertError } = await supabase
    .from('order_otps')
    .upsert({
      seller_id: seller.id,
      slug,
      email,
      code_hash: codeHash,
      attempts: 0,
      verified: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, { onConflict: 'seller_id,email' })
    .select('id')
    .single()

  if (insertError || !insertedOtp) {
    console.error('[send-otp] insert error:', insertError)
    Sentry.captureException(new Error(`send-otp OTP upsert: ${insertError?.message ?? 'no row returned'}`), { tags: { module: 'send-otp' } })
    return noStoreJson({ error: 'Erreur interne. Réessayez.' }, 500)
  }

  let sent = true
  await sendOrderOtpEmail({
    to: email,
    code,
    sellerName: seller.name ?? slug,
  }).catch(err => {
    sent = false
    console.error('[send-otp] email error:', err)
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { module: 'send-otp', action: 'send_email' },
    })
  })

  if (!sent) {
    // Ne supprime pas un éventuel code plus récent écrit par une requête concurrente.
    await supabase
      .from('order_otps')
      .delete()
      .eq('id', insertedOtp.id)
      .eq('code_hash', codeHash)
    return noStoreJson({ error: 'Erreur lors de l’envoi de l’email. Réessayez.' }, 502)
  }

  return noStoreJson({ ok: true })
}
