import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { checkOrigin } from '@/lib/csrf'
import { requireActiveResponse } from '@/lib/assert-active'

// Rôles disponibles : 'admin' | 'operator' | 'readonly'
// Le propriétaire et les membres actifs ayant déjà le rôle admin peuvent promouvoir
// un autre membre en admin via cet endpoint.
// La promotion au rôle 'admin' donne accès aux suppressions, anonymisations et changements
// de rôle — voir TEAM_ROLES.md pour la matrice complète des permissions.

// PATCH /api/team/[memberId] — changer le rôle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'pro' && context.plan !== 'business') {
    return NextResponse.json({ error: 'Disponible dans le plan Pro' }, { status: 403 })
  }
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

  const { memberId } = await params
  const body = await request.json()
  const role: string = body.role ?? ''

  if (!['admin', 'operator', 'readonly'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, user_id, email, name')
    .eq('id', memberId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  if (member.user_id === context.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('team_members')
    .update({ role })
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ROLE_LABELS: Record<string, string> = { operator: 'Opérateur', readonly: 'Lecture seule', admin: 'Admin' }
  const memberName = member.name ?? member.email

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'member_role_changed',
    entityType: 'team_member',
    entityId: memberId,
    description: `a changé le rôle de ${memberName} en ${ROLE_LABELS[role] ?? role}`,
    metadata: { email: member.email, newRole: role },
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/team/[memberId] — supprimer un membre
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'pro' && context.plan !== 'business') {
    return NextResponse.json({ error: 'Disponible dans le plan Pro' }, { status: 403 })
  }
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

  const { memberId } = await params
  const serviceClient = createServiceClient()

  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, user_id, email, name')
    .eq('id', memberId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  if (member.user_id === context.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('team_members')
    .delete()
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const memberName = member.name ?? member.email

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'member_removed',
    entityType: 'team_member',
    entityId: memberId,
    description: `a retiré ${memberName} de l'équipe`,
    metadata: { email: member.email },
  })

  return NextResponse.json({ success: true })
}
