import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')
  if (code) {
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
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/', request.url))
}
