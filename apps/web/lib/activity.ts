import { createServiceClient } from '@/lib/supabase/service'

type LogActivityParams = {
  sellerId: string
  userId: string
  userName?: string
  actionType: string
  entityType?: string
  entityId?: string
  description: string
  metadata?: object
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const serviceClient = createServiceClient()
    const userName = await resolveActivityUserName(serviceClient, params)

    await serviceClient.from('activity_logs').insert({
      seller_id: params.sellerId,
      user_id: params.userId,
      user_name: userName,
      action_type: params.actionType,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      description: params.description,
      metadata: params.metadata ?? {},
    })
  } catch {
    // Log silencieusement — ne doit jamais bloquer l'action principale
  }
}

async function resolveActivityUserName(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: LogActivityParams
) {
  const { data: member } = await serviceClient
    .from('team_members')
    .select('name, email')
    .eq('seller_id', params.sellerId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (member?.name || member?.email) return member.name ?? member.email

  const { data: seller } = await serviceClient
    .from('sellers')
    .select('name, email')
    .eq('id', params.userId)
    .maybeSingle()

  return seller?.name ?? seller?.email ?? params.userName ?? params.userId
}
