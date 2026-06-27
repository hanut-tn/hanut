'use server'

import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActive } from '@/lib/assert-active'
import { HanutAddressFieldsSchema } from '@/lib/address'

export type CustomerInput = {
  name: string
  phone: string
  customer_governorate?: string
  customer_city?: string
  customer_delegation?: string
  customer_address?: string
  customer_landmark?: string
  customer_postal_code?: string
  delivery_notes?: string
  address?: string
  city?: string
}

// updateCustomer force systématiquement address_version: 2 et valide l'adresse
// complète via HanutAddressFieldsSchema (gouvernorat, ville, adresse, repère obligatoires).
// Conséquence intentionnelle : modifier un client v1 (legacy address/city) oblige
// à renseigner les champs structurés — c'est le mécanisme de migration progressive.
// Si seul le nom ou le téléphone doit changer sur un client legacy, l'appelant
// doit passer les champs customer_* actuels du client pour passer la validation.
export async function updateCustomer(id: string, input: CustomerInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()
  const parsedAddress = HanutAddressFieldsSchema.safeParse({
    customer_governorate: input.customer_governorate ?? input.city,
    customer_city: input.customer_city,
    customer_delegation: input.customer_delegation,
    customer_address: input.customer_address ?? input.address,
    customer_landmark: input.customer_landmark,
    customer_postal_code: input.customer_postal_code,
    delivery_notes: input.delivery_notes,
  })
  if (!parsedAddress.success) {
    return { error: parsedAddress.error.issues[0]?.message ?? 'Adresse invalide.' }
  }

  const address = parsedAddress.data

  const { error } = await supabase
    .from('customers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: address.customer_address,
      city: address.customer_governorate,
      customer_governorate: address.customer_governorate,
      customer_city: address.customer_city,
      customer_delegation: address.customer_delegation ?? null,
      customer_address: address.customer_address,
      customer_landmark: address.customer_landmark,
      customer_postal_code: address.customer_postal_code ?? null,
      delivery_notes: address.delivery_notes ?? null,
      address_version: 2,
    })
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'customer_updated',
    entityType: 'customer',
    entityId: id,
    description: `a modifié le client ${input.name.trim()}`,
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer des clients' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  // Récupérer le nom du client pour le log
  const { data: customerData } = await supabase
    .from('customers')
    .select('name')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  // Bloquer si commandes actives (non soft-deleted)
  const { count: activeCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (activeCount && activeCount > 0) {
    return {
      error: `Ce client a ${activeCount} commande${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''}. Supprimez-les d'abord avant de supprimer le client.`,
    }
  }

  // Bloquer si commandes en corbeille (FK constraint DB)
  const { count: trashedCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)

  if (trashedCount && trashedCount > 0) {
    return {
      error: `Ce client a ${trashedCount} commande${trashedCount > 1 ? 's' : ''} dans la corbeille. Videz la corbeille d'abord avant de supprimer le client.`,
    }
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'customer_deleted',
    entityType: 'customer',
    entityId: id,
    description: `a supprimé le client ${customerData?.name ?? id}`,
  })

  revalidatePath('/customers')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function anonymizeCustomer(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent anonymiser des clients' }

  const supabase = await createServerClient()

  const { error } = await supabase.rpc('anonymize_customer', {
    p_seller_id: context.sellerId,
    p_customer_id: id,
  })

  if (error) {
    if (error.message.includes('CUSTOMER_NOT_FOUND')) return { error: 'Client introuvable.' }
    if (error.code === 'PGRST202' || error.message.includes('schema cache')) {
      Sentry.captureException(new Error(`anonymize_customer unavailable: ${error.message}`), {
        tags: { module: 'customer_anonymization' },
        extra: { sellerId: context.sellerId, customerId: id },
      })
      return {
        error: 'L’anonymisation est temporairement indisponible. La migration Supabase doit être appliquée.',
      }
    }
    if (error.code === '42804' || error.message.includes('column "tags" is of type jsonb')) {
      Sentry.captureException(new Error(`anonymize_customer tags mismatch: ${error.message}`), {
        tags: { module: 'customer_anonymization' },
        extra: { sellerId: context.sellerId, customerId: id },
      })
      return {
        error: 'L’anonymisation doit être mise à jour dans Supabase avant de réessayer.',
      }
    }
    if (error.code === '42883' || error.message.includes('operator does not exist: uuid = text')) {
      Sentry.captureException(new Error(`anonymize_customer entity mismatch: ${error.message}`), {
        tags: { module: 'customer_anonymization' },
        extra: { sellerId: context.sellerId, customerId: id },
      })
      return {
        error: 'La fonction d’anonymisation doit être mise à jour dans Supabase avant de réessayer.',
      }
    }
    Sentry.captureException(new Error(`anonymize_customer failed: ${error.message}`), {
      tags: { module: 'customer_anonymization' },
      extra: { sellerId: context.sellerId, customerId: id },
    })
    return { error: 'Une erreur est survenue lors de l\'anonymisation. Réessayez ou contactez le support.' }
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'customer_updated',
    entityType: 'customer',
    entityId: id,
    description: 'a anonymisé les données personnelles d’un client',
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}
