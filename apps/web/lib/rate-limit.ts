import { createServiceClient } from '@/lib/supabase/service'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetIn: number  // secondes avant réinitialisation de la fenêtre
}

type RateLimitRow = {
  allowed: boolean
  remaining: number
  reset_in: number
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const supabase = createServiceClient()
  const windowSeconds = windowMinutes * 60

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    throw new Error('Rate limit response is invalid')
  }

  const result = row as Partial<RateLimitRow>
  if (
    typeof result.allowed !== 'boolean' ||
    typeof result.remaining !== 'number' ||
    typeof result.reset_in !== 'number'
  ) {
    throw new Error('Rate limit response is invalid')
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetIn: result.reset_in,
  }
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'anonymous'
  )
}
