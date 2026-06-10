const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileVerifyResponse = {
  success?: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Turnstile] TURNSTILE_SECRET_KEY absent — ' +
        'vérification désactivée en développement.'
      )
      return true
    }
    console.error(
      '[Turnstile] TURNSTILE_SECRET_KEY absent en production — ' +
      'toutes les commandes publiques sont bloquées. ' +
      'Configurer la variable immédiatement.'
    )
    return false
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
