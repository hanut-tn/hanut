import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value as EmailOtpType)
}

function isSafeRedirect(path: string | null): boolean {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.startsWith('/\\')) return false
  if (path.includes(':')) return false
  if (path.includes('@')) return false
  try {
    const url = new URL(path, 'http://localhost')
    return url.hostname === 'localhost'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (code || tokenHash) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list: { name: string; value: string; options?: object }[]) =>
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never)),
        },
      }
    )

    const { error } = tokenHash && isEmailOtpType(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error('Type de lien invalide') }

    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('auth_error', 'invalid_or_expired_link')
      return NextResponse.redirect(loginUrl)
    }
  }
  const next = requestUrl.searchParams.get('next')
  const redirectPath = isSafeRedirect(next) ? next! : '/dashboard'
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
