import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { formatTunisianPhone, isValidTunisianPhone } from '@/lib/constants'
import {
  hashOrderOtp,
  normalizeOtpEmail,
  normalizeOtpSlug,
  otpRateLimitIdentifier,
} from '@/lib/order-otp'

const VerifyOtpSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{4}$/),
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().min(1),
  customer_address: z.string().trim().min(2).max(200),
  customer_city: z.string().trim().min(1).max(100),
  product_id: z.string().uuid(),
  variant: z.string().trim().max(100).optional(),
  quantity: z.coerce.number().int().min(1).max(99),
  notes: z.string().trim().max(500).optional(),
  turnstile_token: z.string().optional(),
})

type OtpRpcResult = {
  ok?: boolean
  error?: string
  detail?: string
  order_id?: string
  tracking_token?: string | null
  seller_id?: string
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
  const parsed = VerifyOtpSchema.safeParse(rawBody)
  if (!parsed.success) {
    return noStoreJson(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      400,
    )
  }

  const slug = normalizeOtpSlug(parsed.data.slug)
  const email = normalizeOtpEmail(parsed.data.email)
  const phone = formatTunisianPhone(parsed.data.customer_phone)
  if (!isValidTunisianPhone(phone)) {
    return noStoreJson({ error: 'Numéro de téléphone tunisien invalide.' }, 400)
  }

  const ip = getClientIp(request.headers)
  try {
    const ipLimit = await checkRateLimit(ip, 'verify_otp_ip', 20, 10)
    if (!ipLimit.allowed) {
      return noStoreJson({ error: 'Trop de tentatives. Demandez un nouveau code.' }, 429)
    }
  } catch (error) {
    console.error('[verify-otp] rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
  }

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstile_token ?? '', ip)
  if (!turnstileOk) {
    return noStoreJson({ error: 'Vérification anti-spam échouée. Réessayez.' }, 403)
  }

  try {
    const otpLimit = await checkRateLimit(
      otpRateLimitIdentifier(slug, email),
      'verify_otp_recipient',
      10,
      10,
    )
    if (!otpLimit.allowed) {
      return noStoreJson({ error: 'Trop de tentatives. Demandez un nouveau code.' }, 429)
    }
  } catch (error) {
    console.error('[verify-otp] recipient rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('create_public_order_with_otp', {
    p_slug: slug,
    p_email: email,
    p_code_hash: hashOrderOtp(parsed.data.code, slug, email),
    p_product_id: parsed.data.product_id,
    p_quantity: parsed.data.quantity,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: phone,
    p_customer_address: parsed.data.customer_address,
    p_customer_city: parsed.data.customer_city,
    p_variant: parsed.data.variant || null,
    p_notes: parsed.data.notes || null,
  })

  if (error) {
    console.error('[verify-otp] RPC error:', error)
    return noStoreJson({ error: 'Erreur lors de la création de la commande.' }, 500)
  }

  const result = (data ?? {}) as OtpRpcResult
  if (!result.ok) {
    switch (result.error) {
      case 'OTP_INCORRECT':
      case 'OTP_NOT_FOUND':
        return noStoreJson({ error: 'Code incorrect. Vérifiez votre email.' }, 400)
      case 'OTP_EXPIRED':
        return noStoreJson({ error: 'Code expiré. Cliquez sur « Renvoyer le code ».' }, 400)
      case 'OTP_TOO_MANY_ATTEMPTS':
        return noStoreJson({ error: 'Trop de codes incorrects. Demandez un nouveau code.' }, 429)
      case 'SHOP_NOT_FOUND':
        return noStoreJson({ error: 'Boutique introuvable.' }, 404)
      case 'ORDER_CREATION_FAILED': {
        const detail = result.detail ?? ''
        if (detail.includes('LIMIT_REACHED')) {
          return noStoreJson(
            { error: 'Cette boutique a atteint sa limite de commandes ce mois-ci.' },
            429,
          )
        }
        if (
          detail.toLowerCase().includes('insuffisant')
          || detail.toLowerCase().includes('stock')
        ) {
          return noStoreJson(
            { error: 'Stock insuffisant. Ce produit vient d’être épuisé.' },
            409,
          )
        }
        if (detail.includes('SHOP_INACTIVE')) {
          return noStoreJson({ error: 'Cette boutique n’accepte plus de commandes.' }, 403)
        }
        if (
          detail.toLowerCase().includes('produit introuvable')
          || detail.toLowerCase().includes('variante invalide')
          || detail.toLowerCase().includes('variante obligatoire')
        ) {
          return noStoreJson({ error: 'Produit ou variante indisponible.' }, 409)
        }
        return noStoreJson({ error: 'Erreur lors de la création de la commande.' }, 500)
      }
      default:
        return noStoreJson({ error: 'Vérification impossible. Réessayez.' }, 400)
    }
  }

  if (!result.order_id || !result.tracking_token || !result.seller_id) {
    return noStoreJson({ error: 'Réponse de création invalide.' }, 500)
  }

  revalidateTag(`dashboard-${result.seller_id}`)

  return noStoreJson({
    order_id: result.order_id.slice(0, 8).toUpperCase(),
    tracking_token: result.tracking_token,
  })
}
