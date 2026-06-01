import { createServerClient } from '@/lib/supabase/server'
import CustomersClient from '@/components/customers/CustomersClient'
import { updateCustomer, deleteCustomer } from './actions'

export default async function CustomersPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, phone, address, city, created_at,
      orders(id, cod_amount, status, created_at)
    `)
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <CustomersClient
      customers={(customers ?? []) as any[]}
      updateCustomer={updateCustomer}
      deleteCustomer={deleteCustomer}
    />
  )
}
