import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

type EnsureSignupSellerProfileInput = {
  userId: string
  email: string
  shopName?: unknown
  phone?: unknown
}

export type EnsureSignupSellerProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; duplicateEmail?: boolean; error: string }

const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ؤ': 'w',
  'ئ': 'y', 'لا': 'la', 'لأ': 'la', 'لآ': 'la', 'لإ': 'li',
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeShopName(value: unknown): string {
  return normalizeOptionalString(value)?.slice(0, 100) ?? 'Ma boutique'
}

export function generateSlug(name: string): string {
  const transliterated = name
    .split('')
    .map(char => ARABIC_TO_LATIN[char] ?? char)
    .join('')

  const slug = transliterated
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  if (!slug || slug.length < 2) {
    return `boutique-${Date.now().toString(36)}`
  }

  return slug
}

export async function ensureSignupSellerProfile(
  serviceClient: ServiceClient,
  input: EnsureSignupSellerProfileInput,
): Promise<EnsureSignupSellerProfileResult> {
  const shopName = normalizeShopName(input.shopName)
  const phone = normalizeOptionalString(input.phone)
  const email = input.email.trim().toLowerCase()
  const baseSlug = generateSlug(shopName)
  let inserted = false
  let existingSellerForUser = false
  let lastError: string | null = null

  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
    const { error } = await serviceClient.from('sellers').insert({
      id: input.userId,
      email,
      name: shopName,
      phone,
      slug,
      plan: 'starter',
    })

    if (!error) {
      inserted = true
      break
    }

    lastError = error.message
    if (error.code !== '23505') break
    if (error.message.includes('sellers_pkey')) {
      existingSellerForUser = true
      break
    }
    if (error.message.includes('sellers_email_key')) {
      return { ok: false, duplicateEmail: true, error: error.message }
    }
  }

  if (!inserted && !existingSellerForUser) {
    return { ok: false, error: lastError ?? 'seller insert failed' }
  }

  const { error: trialError } = await serviceClient.rpc('set_demo_trial', {
    p_seller_id: input.userId,
  })

  if (trialError) {
    if (inserted) {
      await serviceClient.from('sellers').delete().eq('id', input.userId)
    }
    return { ok: false, error: trialError.message }
  }

  return { ok: true, created: inserted }
}
