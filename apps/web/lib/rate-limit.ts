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
  // x-vercel-forwarded-for : IP réelle injectée par l'infrastructure Vercel,
  // uniquement fiable quand l'exécution est effectivement hébergée par Vercel.
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    const vercelIp = firstIp(headers.get('x-vercel-forwarded-for'))
    if (vercelIp) return vercelIp
  }

  // Fallback pour les environnements non-Vercel (dev local, autres hébergeurs).
  // Ce chemin est best-effort : seul un proxy de confiance peut garantir l'IP.
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean)
    const publicIp = ips.find(ip => !isPrivateIp(ip))
    if (publicIp) return publicIp
    if (ips[0]) return ips[0]
  }

  return firstIp(headers.get('x-real-ip')) ?? 'anonymous'
}

function firstIp(value: string | null): string | null {
  const ip = value?.split(',')[0]?.trim()
  return ip || null
}

function isPrivateIp(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('192.168.') ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost'
  )
}
