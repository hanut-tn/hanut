const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileVerifyResponse = {
  success?: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  if (!token) return false

  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip) formData.append('remoteip', ip)

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      cache: 'no-store',
    })

    if (!response.ok) return false

    const data = (await response.json()) as TurnstileVerifyResponse
    return data.success === true
  } catch {
    return false
  }
}
