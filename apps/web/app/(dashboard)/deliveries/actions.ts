'use server'

import { createServerClient } from '@/lib/supabase/server'
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
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase.from('deliveries').insert({
    order_id: input.order_id,
    carrier: input.carrier,
    tracking_number: input.tracking_number || null,
    fee: input.fee ?? null,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

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
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
}
