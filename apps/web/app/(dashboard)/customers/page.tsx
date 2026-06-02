import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomersClient from '@/components/customers/CustomersClient'
import { updateCustomer, deleteCustomer } from './actions'

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
    .order('created_at', { ascending: false })

  return (
    <CustomersClient
      customers={(customers ?? []) as any[]}
      updateCustomer={updateCustomer}
      deleteCustomer={deleteCustomer}
    />
  )
}
