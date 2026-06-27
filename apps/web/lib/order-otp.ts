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
  const secret = process.env.OTP_HMAC_SECRET
  if (!secret) {
    throw new Error('OTP_HMAC_SECRET is required to hash order OTPs.')
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
