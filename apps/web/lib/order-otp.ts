import { createHash, createHmac, randomInt } from 'node:crypto'

export function normalizeOtpEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeOtpSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

export function generateOrderOtp(): string {
  return String(randomInt(1000, 10000))
}

export function hashOrderOtp(code: string, slug: string, email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to hash order OTPs.')
  }

  return createHmac('sha256', secret)
    .update(`${normalizeOtpSlug(slug)}:${normalizeOtpEmail(email)}:${code}`)
    .digest('hex')
}

export function otpRateLimitIdentifier(slug: string, email: string): string {
  return createHash('sha256')
    .update(`${normalizeOtpSlug(slug)}:${normalizeOtpEmail(email)}`)
    .digest('hex')
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}
