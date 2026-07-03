import { randomBytes } from 'crypto'
import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { checkOrigin } from '@/lib/csrf'
import { requireActiveResponse } from '@/lib/assert-active'
import { buildAuthCallbackUrl, buildAuthEmailActionUrl } from '@/lib/auth-redirect'
import { sendTeamInvitationEmail } from '@/lib/email'

type Params = {
  params: Promise<{ memberId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan === 'starter') {
    return NextResponse.json({ error: 'Disponible dans le plan Pro' }, { status: 403 })
  }
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

  const { memberId } = await params
  const serviceClient = createServiceClient()

  const { data: member } = await serviceClient
    .from('team_members')
    .select('id, email, role, status, invitation_token, invited_at, expires_at')
    .eq('id', memberId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
  if (member.status !== 'pending') {
    return NextResponse.json({ error: "Seules les invitations en attente peuvent être renvoyées" }, { status: 400 })
  }

  const newToken = randomBytes(32).toString('hex')
  const invitedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Stocker le nouveau token avant d'envoyer l'invitation pour que
  // le layout puisse l'activer via user_metadata.invitation_token.
  const { error: updateError } = await serviceClient
    .from('team_members')
    .update({
      invitation_token: newToken,
      invited_at: invitedAt,
      expires_at: expiresAt,
    })
    .eq('id', member.id)
    .eq('seller_id', context.sellerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.generateLink({
    type: 'invite',
    email: member.email,
    options: {
      redirectTo: buildAuthCallbackUrl('/accept-invitation', request.nextUrl.origin),
      data: {
        invited_by: user?.email,
        team_role: member.role,
        invitation_token: newToken,
      },
    },
  })

  if (inviteError || !inviteData?.properties?.hashed_token) {
    Sentry.captureException(new Error(`team invite resend generateLink: ${inviteError?.message ?? 'missing hashed token'}`), {
      tags: { module: 'team', action: 'resend_invitation_link' },
    })
    await serviceClient
      .from('team_members')
      .update({
        invitation_token: member.invitation_token ?? null,
        invited_at: member.invited_at ?? null,
        expires_at: member.expires_at ?? null,
      })
      .eq('id', member.id)
      .eq('seller_id', context.sellerId)

    return NextResponse.json({ error: `Erreur d'invitation : ${inviteError?.message ?? 'lien manquant'}` }, { status: 500 })
  }

  const ROLE_LABELS: Record<string, string> = { operator: 'Opérateur', readonly: 'Lecture seule' }

  try {
    await sendTeamInvitationEmail({
      to: member.email,
      invitationUrl: buildAuthEmailActionUrl({
        tokenHash: inviteData.properties.hashed_token,
        type: 'invite',
        nextPath: '/accept-invitation',
      }, request.nextUrl.origin),
      inviterEmail: user?.email,
      roleLabel: ROLE_LABELS[member.role] ?? member.role,
    })
  } catch (emailError) {
    Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
      tags: { module: 'team', action: 'resend_invitation_email' },
    })
    await serviceClient
      .from('team_members')
      .update({
        invitation_token: member.invitation_token ?? null,
        invited_at: member.invited_at ?? null,
        expires_at: member.expires_at ?? null,
      })
      .eq('id', member.id)
      .eq('seller_id', context.sellerId)

    return NextResponse.json(
      { error: "Impossible d'envoyer l'email d'invitation. Réessayez." },
      { status: 503 }
    )
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'member_invited',
    entityType: 'team_member',
    entityId: member.id,
    description: `a renvoyé l'invitation à ${member.email}`,
    metadata: { email: member.email, role: member.role, resend: true },
  })

  return NextResponse.json({ success: true, invited_at: invitedAt, expires_at: expiresAt })
}
