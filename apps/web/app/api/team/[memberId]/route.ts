import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'

// PATCH /api/team/[memberId] — changer le rôle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })

  const { memberId } = await params
  const body = await request.json()
  const role: string = body.role ?? ''

  if (!['admin', 'operator', 'readonly'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Vérifie que le membre appartient bien à cette boutique
  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  // On ne peut pas se modifier soi-même
  if (member.user_id === context.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('team_members')
    .update({ role })
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/team/[memberId] — supprimer un membre
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })

  const { memberId } = await params
  const serviceClient = createServiceClient()

  // Vérifie appartenance et empêche l'auto-suppression
  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, user_id')
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
  return NextResponse.json({ success: true })
}
