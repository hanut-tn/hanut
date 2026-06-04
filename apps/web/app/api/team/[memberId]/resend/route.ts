import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'

type Params = {
  params: Promise<{ memberId: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'business') {
    return NextResponse.json({ error: 'Disponible dans le plan Business' }, { status: 403 })
  }

  const { memberId } = await params
  const serviceClient = createServiceClient()

  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, email, role, status')
    .eq('id', memberId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
  if (member.status !== 'pending') {
    return NextResponse.json({ error: "Seules les invitations en attente peuvent être renvoyées" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hanut.tn'

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(member.email, {
    redirectTo: `${appUrl}/api/auth/callback`,
    data: {
      invited_by: user?.email,
      team_role: member.role,
    },
  })

  if (inviteError) {
    return NextResponse.json({ error: `Erreur d'invitation : ${inviteError.message}` }, { status: 500 })
  }

  const invitedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await serviceClient
    .from('team_members')
    .update({
      invited_at: invitedAt,
      expires_at: expiresAt,
    })
    .eq('id', member.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    actionType: 'member_invited',
    entityType: 'team_member',
    entityId: member.id,
    description: `a renvoyé l'invitation à ${member.email}`,
    metadata: { email: member.email, role: member.role, resend: true },
  })

  return NextResponse.json({ success: true, invited_at: invitedAt, expires_at: expiresAt })
}
