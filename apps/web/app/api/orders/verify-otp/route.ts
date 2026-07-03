import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse, after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { formatTunisianPhone, isValidTunisianPhone } from '@/lib/constants'
import { getAppUrl, sendSellerNewOrderEmail } from '@/lib/email'
import {
  hashOrderOtp,
  normalizeOtpEmail,
  normalizeOtpSlug,
  otpRateLimitIdentifier,
} from '@/lib/order-otp'
import { HanutAddressFieldsSchema } from '@/lib/address'

const OrderItemInputSchema = z.object({
  product_id: z.string().uuid('Produit invalide.'),
  variant: z.string().trim().max(100, 'Variante trop longue.').optional(),
  quantity: z.coerce.number().int('Quantité invalide.').min(1, 'Quantité minimum : 1.').max(99, 'Quantité maximum : 99.'),
})

const VerifyOtpSchema = z.object({
  slug: z.string().trim().min(1, 'Boutique manquante.').max(120, 'Boutique invalide.'),
  email: z.string().trim().email('Adresse email invalide.').max(254, 'Adresse email trop longue.'),
  code: z.string().regex(/^\d{4}$/, 'Le code doit contenir 4 chiffres.'),
  customer_name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(100, 'Le nom est trop long.'),
  customer_phone: z.string().min(1, 'Le téléphone est obligatoire.'),
  product_id: z.string().uuid('Produit invalide.').optional(),
  variant: z.string().trim().max(100, 'Variante trop longue.').optional(),
  quantity: z.coerce.number().int('Quantité invalide.').min(1, 'Quantité minimum : 1.').max(99, 'Quantité maximum : 99.').optional(),
  notes: z.string().trim().max(500, 'Notes trop longues (500 caractères maximum).').optional(),
  turnstile_token: z.string(),
  items: z.array(OrderItemInputSchema).max(20, 'Maximum 20 articles.').optional(),
}).merge(HanutAddressFieldsSchema)

type OtpRpcResult = {
  ok?: boolean
  error?: string
  detail?: string
  order_id?: string
  tracking_token?: string | null
  seller_id?: string
}

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
  try {
    return await postHandler(request)
  } catch (err) {
    console.error('[verify-otp] Unhandled exception:', err)
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { tags: { module: 'verify-otp', action: 'unhandled' } })
    return noStoreJson({ error: 'Erreur interne inattendue.' }, 500)
  }
}

async function postHandler(request: NextRequest) {
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

  const parsed = VerifyOtpSchema.safeParse(rawBody)
  if (!parsed.success) {
    return noStoreJson(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      400,
    )
  }

  if (!parsed.data.items?.length && !parsed.data.product_id) {
    return noStoreJson({ error: 'Produit ou articles obligatoires.' }, 400)
  }

  const slug = normalizeOtpSlug(parsed.data.slug)
  const email = normalizeOtpEmail(parsed.data.email)
  const phone = formatTunisianPhone(parsed.data.customer_phone)
  if (!isValidTunisianPhone(phone)) {
    return noStoreJson({ error: 'Numéro de téléphone tunisien invalide.' }, 400)
  }

  try {
    const ipLimit = await checkRateLimit(ip, 'verify_otp_ip', 20, 10)
    if (!ipLimit.allowed) {
      return noStoreJson({ error: 'Trop de tentatives. Demandez un nouveau code.' }, 429)
    }
  } catch (error) {
    console.error('[verify-otp] rate-limit error:', error)
    return noStoreJson({ error: 'Protection anti-spam indisponible. Réessayez.' }, 503)
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

  let codeHash: string
  try {
    codeHash = hashOrderOtp(parsed.data.code, slug, email)
  } catch (err) {
    console.error('[verify-otp] hashOrderOtp error:', err)
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { tags: { module: 'verify-otp', action: 'hash_otp' } })
    return noStoreJson({ error: 'Erreur de configuration interne.' }, 500)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('create_public_order_with_otp', {
    p_slug: slug,
    p_email: email,
    p_code_hash: codeHash,
    p_product_id: parsed.data.product_id || null,
    p_quantity: parsed.data.quantity ?? 1,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: phone,
    p_customer_address: parsed.data.customer_address,
    p_customer_city: parsed.data.customer_city,
    p_variant: parsed.data.variant || null,
    p_notes: parsed.data.notes || null,
    p_customer_governorate: parsed.data.customer_governorate,
    p_customer_delegation: parsed.data.customer_delegation || null,
    p_customer_landmark: parsed.data.customer_landmark ?? null,
    p_customer_postal_code: parsed.data.customer_postal_code || null,
    p_delivery_notes: parsed.data.delivery_notes || null,
    p_items: parsed.data.items && parsed.data.items.length > 0 ? parsed.data.items : null,
  })

  if (error) {
    console.error('[verify-otp] RPC error:', error)
    Sentry.captureException(new Error(`verify-otp RPC error: ${error.message}`), { tags: { module: 'verify-otp' } })
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
            { error: "Stock insuffisant. Ce produit vient d'être épuisé." },
            409,
          )
        }
        if (detail.includes('SHOP_INACTIVE')) {
          return noStoreJson({ error: "Cette boutique n'accepte plus de commandes." }, 403)
        }
        if (
          detail.toLowerCase().includes('produit introuvable')
          || detail.toLowerCase().includes('variante invalide')
          || detail.toLowerCase().includes('variante obligatoire')
        ) {
          return noStoreJson({ error: 'Produit ou variante indisponible.' }, 409)
        }
        console.error('[verify-otp] ORDER_CREATION_FAILED unhandled detail:', detail)
        Sentry.captureException(new Error(`ORDER_CREATION_FAILED: ${detail}`), { tags: { module: 'verify-otp', action: 'order_creation' } })
        return noStoreJson({ error: 'Erreur lors de la création de la commande.' }, 500)
      }
      default:
        return noStoreJson({ error: 'Vérification impossible. Réessayez.' }, 400)
    }
  }

  if (!result.order_id || !result.tracking_token || !result.seller_id) {
    return noStoreJson({ error: 'Réponse de création invalide.' }, 500)
  }
  const sellerId = result.seller_id
  const orderId = result.order_id

  revalidateTag(`dashboard-${sellerId}`)

  // after() garde la fonction serverless active le temps de l'envoi : sans
  // ça, Vercel peut geler l'exécution dès la réponse renvoyée et tuer la
  // requête Resend en plein vol (fire-and-forget non fiable en serverless).
  after(() =>
    notifySellerNewOrder({
      sellerId,
      orderId,
      customerName: parsed.data.customer_name,
      customerPhone: phone,
      productId: parsed.data.product_id,
      variant: parsed.data.variant,
      quantity: parsed.data.quantity ?? 1,
      items: parsed.data.items,
    }).catch(err => {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: { module: 'verify-otp', action: 'notify_seller' },
        extra: { sellerId, orderId },
      })
    })
  )

  return noStoreJson({
    order_id: result.order_id.slice(0, 8).toUpperCase(),
    tracking_token: result.tracking_token,
  })
}

// ─── Notification vendeur ──────────────────────────────────────────────────────

type NotifyOpts = {
  sellerId: string
  orderId: string
  customerName: string
  customerPhone: string
  productId?: string | null
  variant?: string | null
  quantity: number
  items?: Array<{ product_id: string; variant?: string; quantity: number }> | null
}

type SellerOrderLine = {
  label: string
  quantity: number
  total?: string
}

async function notifySellerNewOrder(opts: NotifyOpts): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  const supabase = createServiceClient()

  const { data: seller } = await supabase
    .from('sellers')
    .select('email, name')
    .eq('id', opts.sellerId)
    .single()

  if (!seller?.email) return

  const orderUrl = `${getAppUrl()}/orders/${opts.orderId}`

  let lines: SellerOrderLine[] = []
  if (opts.items && opts.items.length > 0) {
    const ids = [...new Set(opts.items.map(i => i.product_id))]
    const { data: products } = await supabase.from('products').select('id, name, price').in('id', ids)
    const map = new Map((products ?? []).map(p => [p.id, p]))
    lines = opts.items.map(item => {
      const p = map.get(item.product_id)
      const label = p ? (item.variant ? `${p.name} — ${item.variant}` : p.name) : 'Produit'
      return {
        label,
        quantity: item.quantity,
        total: p ? `${(p.price * item.quantity).toFixed(2)} DT` : undefined,
      }
    })
  } else if (opts.productId) {
    const { data: p } = await supabase.from('products').select('name, price').eq('id', opts.productId).single()
    if (p) {
      const label = opts.variant ? `${p.name} — ${opts.variant}` : p.name
      lines = [{
        label,
        quantity: opts.quantity,
        total: `${(p.price * opts.quantity).toFixed(2)} DT`,
      }]
    }
  }

  await sendSellerNewOrderEmail({
    to: seller.email,
    orderUrl,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    lines,
  })
}
