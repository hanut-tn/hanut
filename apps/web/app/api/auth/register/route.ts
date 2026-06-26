import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'

const PASSWORD_ERROR = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'

const RegisterSchema = z.object({
  shop_name: z.string().min(2, 'Nom de boutique trop court').max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().max(30).optional(),
  password: z.string().superRefine((val, ctx) => {
    if (
      val.length < 8 ||
      !/[A-Z]/.test(val) ||
      !/[0-9]/.test(val) ||
      !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(val)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PASSWORD_ERROR })
    }
  }),
  turnstile_token: z.string().optional(),
})

const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ؤ': 'w',
  'ئ': 'y', 'لا': 'la', 'لأ': 'la', 'لآ': 'la', 'لإ': 'li',
}

function generateSlug(name: string): string {
  // Translittérer les caractères arabes avant normalisation NFD
  const transliterated = name
    .split('')
    .map(char => ARABIC_TO_LATIN[char] ?? char)
    .join('')

  const slug = transliterated
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  // Fallback unique garanti si le nom ne produit aucun slug latin valide
  if (!slug || slug.length < 2) {
    return `boutique-${Date.now().toString(36)}`
  }

  return slug
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

  const { allowed } = await checkRateLimit(ip, 'auth_register', 5, 1).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429 }
    )
  }

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
    options: {
      emailRedirectTo: buildAuthCallbackUrl('/dashboard', req.nextUrl.origin),
      data: { name: shop_name, phone: phone ?? '' },
    },
  })

  if (signUpError) {
    console.error('[register] signUpError:', signUpError.message)
    return NextResponse.json(
      { error: 'Impossible de créer le compte. Réessayez ou connectez-vous.' },
      { status: 400 }
    )
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
      plan: 'starter',
    })

    if (!error) {
      inserted = true
      break
    }

    lastError = error.message
    if (error.code !== '23505') break
  }

  if (!inserted) {
    console.error('[register] seller insert failed:', lastError)
    await serviceClient.auth.admin.deleteUser(data.user.id).catch(() => {})
    return NextResponse.json({ error: 'Impossible de créer le profil. Réessayez.' }, { status: 500 })
  }

  const { error: trialError } = await serviceClient.rpc('set_demo_trial', {
    p_seller_id: data.user.id,
  })

  if (trialError) {
    // L'inscription promet une démo Pro. Ne jamais laisser un compte partiel
    // en Starter si la RPC d'activation est absente ou échoue.
    await serviceClient.from('sellers').delete().eq('id', data.user.id)
    await serviceClient.auth.admin.deleteUser(data.user.id).catch(() => {})
    return NextResponse.json(
      { error: "Impossible d'activer la démo Pro. Réessayez." },
      { status: 500 }
    )
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
