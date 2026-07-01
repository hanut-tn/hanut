import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureSignupSellerProfile } from '@/lib/signup-profile'
import { checkOrigin } from '@/lib/csrf'

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id || !user?.email) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const profile = await ensureSignupSellerProfile(serviceClient, {
    userId: user.id,
    email: user.email,
    shopName: user.user_metadata?.name as string | undefined,
    phone: user.user_metadata?.phone as string | undefined,
  })

  if (!profile.ok) {
    Sentry.captureException(new Error(profile.error), {
      tags: { module: 'retry_profile' },
      extra: { userId: user.id, email: user.email },
    })
    return NextResponse.json({ error: profile.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
