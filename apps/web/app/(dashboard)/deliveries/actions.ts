'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath } from 'next/cache'
import type { CarrierName } from '@hanut/types'

export type CreateDeliveryInput = {
  order_id: string
  carrier: CarrierName
  tracking_number?: string
  fee?: number
}

export type UpdateDeliveryInput = {
  tracking_number?: string | null
  carrier_status?: string | null
  fee?: number | null
  cod_collected?: boolean
  cod_reversed?: boolean
}

export async function createDelivery(input: CreateDeliveryInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { error } = await supabase.from('deliveries').insert({
    order_id: input.order_id,
    carrier: input.carrier,
    tracking_number: input.tracking_number || null,
    fee: input.fee ?? null,
  })
  if (error) throw new Error(error.message)

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'delivery_created',
    entityType: 'delivery',
    description: `a créé une livraison via ${input.carrier}`,
    metadata: { carrier: input.carrier, tracking: input.tracking_number },
  })

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const patch: Record<string, unknown> = { ...input }

  if (input.cod_collected === true) {
    patch.delivered_at = new Date().toISOString()
  } else if (input.cod_collected === false) {
    patch.delivered_at = null
    patch.cod_reversed = false
  }

  const { error } = await supabase.from('deliveries').update(patch).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
}

export async function deleteDelivery(id: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
}
