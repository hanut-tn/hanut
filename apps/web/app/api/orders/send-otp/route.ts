import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import {
  escapeEmailHtml,
  generateOrderOtp,
  hashOrderOtp,
  normalizeOtpEmail,
  normalizeOtpSlug,
  otpRateLimitIdentifier,
} from '@/lib/order-otp'

const SendOtpSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  turnstile_token: z.string().optional(),
})

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
  const parsed = SendOtpSchema.safeParse(rawBody)
  if (!parsed.success) {
    return noStoreJson({ error: 'Adresse email ou boutique invalide.' }, 400)
  }

  const slug = normalizeOtpSlug(parsed.data.slug)
  const email = normalizeOtpEmail(parsed.data.email)
  const ip = getClientIp(request.headers)

  try {
    const ipLimit = await checkRateLimit(ip, 'send_otp_ip', 3, 10)
    if (!ipLimit.allowed) {
      return noStoreJson({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429)
    }
  } catch (error) {
    console.error('[send-otp] rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
  }

  if (parsed.data.turnstile_token) {
    const turnstileOk = await verifyTurnstileToken(parsed.data.turnstile_token, ip)
    if (!turnstileOk) {
      return noStoreJson({ error: 'Vérification anti-spam échouée. Réessayez.' }, 403)
    }
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
  if (!resendApiKey) {
    console.log(`[OTP DEV] Code pour ${email} (boutique: ${slug}): ${code}`)
  } else {
    const sellerName = escapeEmailHtml(seller.name ?? slug)
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hanut.tn'}/icon-512.png`
    const emailBody = JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'Hanut <noreply@hanut.tn>',
      to: email,
      subject: `${code} — votre code de vérification`,
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
          <img src="${logoUrl}" alt="Hanut" width="48" height="48" style="display:block;margin:0 0 20px;border-radius:10px" />
          <h2 style="color:#1C1917;margin:0 0 8px">Vérification de commande</h2>
          <p style="color:#78716C;margin:0 0 24px">
            Votre code pour commander chez <strong style="color:#1C1917">${sellerName}</strong> :
          </p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <span style="font-size:40px;font-weight:900;letter-spacing:14px;color:#0B5E46;font-family:monospace">${code}</span>
          </div>
          <p style="color:#78716C;font-size:14px;margin:0 0 8px">Ce code expire dans <strong>5 minutes</strong>.</p>
          <p style="color:#A8A29E;font-size:12px;margin:0">
            Si vous n'avez pas initié cette commande, ignorez cet email.
          </p>
        </div>
      `,
    })

    let emailResponse: Response | null = null
    for (let attempt = 0; attempt < 2 && !emailResponse?.ok; attempt++) {
      emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: emailBody,
        signal: AbortSignal.timeout(10_000),
      }).catch(err => {
        console.error(`[send-otp] Resend network error (attempt ${attempt + 1}):`, err)
        if (attempt === 1) {
          Sentry.captureException(new Error(`send-otp Resend network error: ${err?.message}`), { tags: { module: 'send-otp' } })
        }
        return null
      })
    }

    sent = Boolean(emailResponse?.ok)
    if (!sent && emailResponse) {
      const errBody = await emailResponse.text().catch(() => '')
      console.error('[send-otp] Resend error:', errBody)
      Sentry.captureException(
        new Error(`send-otp Resend HTTP ${emailResponse.status}: ${errBody.slice(0, 200)}`),
        { tags: { module: 'send-otp' } }
      )
    }
  }

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
