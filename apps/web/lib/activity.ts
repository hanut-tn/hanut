import * as Sentry from '@sentry/nextjs'
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

// Strip Tunisian phone numbers (8 digits starting with 2, 4, 5, 7 or 9) from log descriptions.
// Defensive layer — descriptions must not contain phone numbers even if callers accidentally include them.
export function sanitizeDescription(desc: string): string {
  return desc.replace(
    /(^|[^\d])(?:(?:\+|00)216[\s.-]?)?[24579](?:[\s.-]?\d){7}(?!\d)/g,
    (_match, prefix: string) => `${prefix}[TÉLÉPHONE]`
  )
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const serviceClient = createServiceClient()
    const userName = await resolveActivityUserName(serviceClient, params)

    const { error } = await serviceClient.from('activity_logs').insert({
      seller_id: params.sellerId,
      user_id: params.userId,
      user_name: userName,
      action_type: params.actionType,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      description: sanitizeDescription(params.description),
      metadata: params.metadata ?? {},
    })
    if (error) {
      console.error('[logActivity] Failed to log activity:', {
        actionType: params.actionType,
        sellerId: params.sellerId,
        error: error.message,
      })
      Sentry.captureException(new Error(`logActivity failed: ${error.message}`), {
        extra: { actionType: params.actionType, sellerId: params.sellerId },
      })
    }
  } catch (err) {
    console.error('[logActivity] Unexpected error:', err)
    Sentry.captureException(err)
  }
}

async function resolveActivityUserName(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: LogActivityParams
) {
  if (params.userName) return params.userName

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

  return seller?.name ?? seller?.email ?? params.userId
}
