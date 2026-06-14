import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { PLAN_LIMITS } from '@/lib/constants'
import { requireActiveResponse } from '@/lib/assert-active'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'

const InviteMemberSchema = z.object({
  email: z.string().min(1, 'Email requis').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide'),
  role: z.enum(['operator', 'readonly'], { error: 'Rôle invalide (operator ou readonly)' }),
})

function getTeamMemberLimit(plan: keyof typeof PLAN_LIMITS) {
  return PLAN_LIMITS[plan].teamMembers
}

// GET /api/team — liste les membres de l'équipe
export async function GET() {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.plan !== 'pro' && context.plan !== 'business') {
    return NextResponse.json({ error: 'Disponible dans le plan Pro' }, { status: 403 })
  }

  const serviceClient = createServiceClient()
  const { data: members, error } = await serviceClient
    .from('team_members')
    .select('id, email, name, role, status, invited_at, joined_at, user_id, expires_at')
    .eq('seller_id', context.sellerId)
    .order('invited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: members ?? [] })
}

// POST /api/team — inviter un nouveau membre
export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })

  const ip = getClientIp(request.headers)
  const { allowed } = await checkRateLimit(ip, 'team_invite', 5, 60).catch(() => ({ allowed: true }))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429 }
    )
  }

  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'pro' && context.plan !== 'business') {
    return NextResponse.json({ error: "La gestion d'équipe est disponible dans le plan Pro" }, { status: 403 })
  }
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })

  const parsed = InviteMemberSchema.safeParse({
    ...rawBody,
    email: typeof rawBody.email === 'string' ? rawBody.email.trim().toLowerCase() : rawBody.email,
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { email, role } = parsed.data

  const serviceClient = createServiceClient()

  const { data: existingSeller } = await serviceClient
    .from('sellers')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (existingSeller) {
    return NextResponse.json(
      { error: 'Cet email est déjà associé à un compte vendeur Hanut' },
      { status: 400 }
    )
  }

  const { count } = await serviceClient
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', context.sellerId)

  const maxMembers = getTeamMemberLimit(context.plan)
  if ((count ?? 0) >= maxMembers) {
    return NextResponse.json(
      { error: `Limite atteinte (${maxMembers} membres maximum par boutique)` },
      { status: 400 }
    )
  }

  const { data: existing } = await serviceClient
    .from('team_members')
    .select('id, status')
    .eq('seller_id', context.sellerId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    const msg = existing.status === 'pending'
      ? 'Une invitation est déjà en attente pour cet email'
      : "Cet email est déjà membre de l'équipe"
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const invitationToken = randomBytes(32).toString('hex')

  const { data: member, error: insertError } = await serviceClient
    .from('team_members')
    .insert({
      seller_id: context.sellerId,
      email,
      role,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_token: invitationToken,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: seller } = await serviceClient.from('sellers').select('name').eq('id', context.sellerId).single()

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: buildAuthCallbackUrl('/reset-password', request.nextUrl.origin),
    data: { invited_by: user?.email, team_role: role, invitation_token: invitationToken },
  })

  if (inviteError) {
    await serviceClient.from('team_members').delete().eq('id', member.id)
    return NextResponse.json({ error: `Erreur d'invitation : ${inviteError.message}` }, { status: 500 })
  }

  const ROLE_LABELS: Record<string, string> = { operator: 'Opérateur', readonly: 'Lecture seule' }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'member_invited',
    entityType: 'team_member',
    entityId: member.id,
    description: `a invité ${email} comme ${ROLE_LABELS[role] ?? role}`,
    metadata: { email, role },
  })

  return NextResponse.json({ success: true })
}
