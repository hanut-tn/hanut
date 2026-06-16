import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomerDetail from '@/components/customers/CustomerDetail'
import AnonymizeCustomerButton from '@/components/customers/AnonymizeCustomerButton'
import { updateCustomer, anonymizeCustomer } from '../actions'
import { buildActiveCustomerAddresses } from '@/lib/customer-addresses'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }
type CustomerOrders = Parameters<typeof CustomerDetail>[0]['orders']
type CustomerAddresses = Parameters<typeof CustomerDetail>[0]['addresses']
type CustomerStats = {
  total_spent: number
  order_count: number
  delivery_rate: number
  favorite_product: string | null
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const { data: customer } = await supabase
    .from('customers')
    .select(`id, name, phone, address, city, customer_governorate, customer_city,
      customer_delegation, customer_address, customer_landmark, customer_postal_code,
      delivery_notes, address_version, created_at, tags, notes`)
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!customer) notFound()

  const [
    { data: orders, count: totalOrders },
    { data: statsRaw, error: statsError },
    { data: addresses },
    { data: activeAddressOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, status, variant, quantity, created_at, product:products(id, name)', { count: 'exact' })
      .eq('customer_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, 9),
    supabase.rpc('get_customer_stats', {
      p_customer_id: id,
      p_seller_id: context.sellerId,
    }),
    supabase
      .from('customer_addresses')
      .select(`id, address, city, customer_governorate, customer_city, customer_delegation,
        customer_address, customer_landmark, customer_postal_code, delivery_notes,
        address_version, use_count, first_used_at, last_used_at`)
      .eq('customer_id', id)
      .eq('seller_id', context.sellerId)
      .order('last_used_at', { ascending: false }),
    supabase
      .from('orders')
      .select(`customer_address, customer_city, customer_governorate, customer_delegation,
        customer_landmark, customer_postal_code, delivery_notes, address_version, created_at`)
      .eq('customer_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (statsError) {
    throw new Error(statsError.message)
  }

  const orderList = orders ?? []
  const activeAddresses = buildActiveCustomerAddresses(
    (addresses ?? []) as Parameters<typeof buildActiveCustomerAddresses>[0],
    (activeAddressOrders ?? []) as Parameters<typeof buildActiveCustomerAddresses>[1],
  )
  const stats = (statsRaw ?? {}) as Partial<CustomerStats>
  const orderCount = totalOrders ?? stats.order_count ?? 0
  const isAnonymized = customer.name === 'Client anonymisé' && customer.phone === '00000000'

  return (
    <>
      <CustomerDetail
        customer={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address ?? undefined,
          city: customer.city ?? undefined,
          customer_governorate: customer.customer_governorate ?? undefined,
          customer_city: customer.customer_city ?? undefined,
          customer_delegation: customer.customer_delegation ?? undefined,
          customer_address: customer.customer_address ?? undefined,
          customer_landmark: customer.customer_landmark ?? undefined,
          customer_postal_code: customer.customer_postal_code ?? undefined,
          delivery_notes: customer.delivery_notes ?? undefined,
          address_version: customer.address_version ?? undefined,
          created_at: customer.created_at,
          tags: (customer.tags as string[] | null) ?? [],
          notes: customer.notes ?? '',
        }}
        orders={orderList as CustomerOrders}
        addresses={activeAddresses as CustomerAddresses}
        totalOrders={orderCount}
        stats={{
          total_spent: stats.total_spent ?? 0,
          order_count: stats.order_count ?? orderCount,
          delivery_rate: stats.delivery_rate ?? 0,
          favorite_product: stats.favorite_product ?? null,
        }}
        plan={context.plan}
        updateCustomer={updateCustomer}
      />
      {context.role === 'admin' && !isAnonymized && (
        <AnonymizeCustomerButton
          customerId={id}
          anonymizeCustomer={anonymizeCustomer}
        />
      )}
    </>
  )
}
