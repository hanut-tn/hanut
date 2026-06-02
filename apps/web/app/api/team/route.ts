import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'

const MAX_MEMBERS = 5

// GET /api/team — liste les membres de l'équipe
export async function GET() {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: members, error } = await serviceClient
    .from('team_members')
    .select('id, email, name, role, status, invited_at, joined_at')
    .eq('seller_id', context.sellerId)
    .order('invited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: members ?? [] })
}

// POST /api/team — inviter un nouveau membre
export async function POST(request: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'business') {
    return NextResponse.json({ error: 'La gestion d\'équipe est disponible dans le plan Business' }, { status: 403 })
  }

  const body = await request.json()
  const email: string = (body.email ?? '').trim().toLowerCase()
  const role: string = body.role ?? ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (!['operator', 'readonly'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide (operator ou readonly)' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Vérifie si l'email est déjà un vendeur Hanut
  const { data: existingSeller } = await serviceClient
    .from('sellers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingSeller) {
    return NextResponse.json(
      { error: 'Cet email est déjà associé à un compte vendeur Hanut' },
      { status: 400 }
    )
  }

  // Compte les membres actuels (actifs + en attente)
  const { count } = await serviceClient
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', context.sellerId)

  if ((count ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json(
      { error: `Limite atteinte (${MAX_MEMBERS} membres maximum par boutique)` },
      { status: 400 }
    )
  }

  // Vérifie si cet email est déjà membre
  const { data: existing } = await serviceClient
    .from('team_members')
    .select('id, status')
    .eq('seller_id', context.sellerId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    const msg = existing.status === 'pending'
      ? 'Une invitation est déjà en attente pour cet email'
      : 'Cet email est déjà membre de l\'équipe'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Crée l'entrée team_members
  const { data: member, error: insertError } = await serviceClient
    .from('team_members')
    .insert({ seller_id: context.sellerId, email, role, status: 'pending' })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Envoie l'invitation par email via Supabase Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hanut.tn'
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/api/auth/callback`,
    data: {
      invited_by: user?.email,
      team_role: role,
    },
  })

  if (inviteError) {
    // Rollback : supprime l'entrée si l'email d'invitation échoue
    await serviceClient.from('team_members').delete().eq('id', member.id)
    return NextResponse.json({ error: `Erreur d'invitation : ${inviteError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
