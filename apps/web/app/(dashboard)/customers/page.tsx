import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomersClient from '@/components/customers/CustomersClient'
import { updateCustomer, deleteCustomer } from './actions'

type Customers = Parameters<typeof CustomersClient>[0]['customers']

export default async function CustomersPage() {
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, phone, address, city, created_at, tags,
      orders(id, cod_amount, status, created_at)
    `)
    .eq('seller_id', context.sellerId)
    .is('orders.deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <CustomersClient
      customers={(customers ?? []) as Customers}
      updateCustomer={updateCustomer}
      deleteCustomer={deleteCustomer}
    />
  )
}
