import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

const RegisterSchema = z.object({
  shop_name: z.string().min(2, 'Nom de boutique trop court').max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().max(30).optional(),
  password: z.string().min(8, 'Mot de passe trop court'),
  turnstile_token: z.string().optional(),
})

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'boutique'
  )
}

function publicAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)

  const rawBody = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(rawBody)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { shop_name, email, phone, password, turnstile_token } = parsed.data
  const turnstileOk = await verifyTurnstileToken(turnstile_token ?? '', ip)
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Vérification anti-spam échouée. Réessayez.' }, { status: 400 })
  }

  const authClient = publicAuthClient()
  const { data, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
    options: { data: { name: shop_name, phone: phone ?? '' } },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  const serviceClient = createServiceClient()
  const baseSlug = generateSlug(shop_name)
  let inserted = false
  let lastError: string | null = null

  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
    const { error } = await serviceClient.from('sellers').insert({
      id: data.user.id,
      email,
      name: shop_name,
      phone: phone || null,
      slug,
    })

    if (!error) {
      inserted = true
      break
    }

    lastError = error.message
    if (error.code !== '23505') break
  }

  if (!inserted) {
    await serviceClient.auth.admin.deleteUser(data.user.id).catch(() => {})
    return NextResponse.json({ error: lastError ?? 'Impossible de créer le profil. Réessayez.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  })
}
