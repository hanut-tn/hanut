import { createServerClient } from '@/lib/supabase/server'
import { getUserContext, getMonthlyOrderCount } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewOrderForm from '@/components/orders/NewOrderForm'
import { createOrder } from '../actions'
import { PLAN_LIMITS, getUpgradeWhatsAppUrl } from '@/lib/constants'
import type { Product } from '@hanut/types'

type Props = { searchParams: Promise<{ customer_id?: string }> }

export default async function NewOrderPage({ searchParams }: Props) {
  const { customer_id } = await searchParams
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const [productsResult, customerResult, monthlyCount] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock, variants, image_url')
      .eq('seller_id', context.sellerId)
      .order('name'),
    customer_id
      ? supabase
          .from('customers')
          .select(`
            id, name, phone,
            customer_governorate, customer_city, customer_delegation,
            customer_address, customer_landmark, customer_postal_code,
            delivery_notes, address, city
          `)
          .eq('id', customer_id)
          .eq('seller_id', context.sellerId)
          .single()
      : Promise.resolve({ data: null }),
    context.plan === 'starter' ? getMonthlyOrderCount(context.sellerId) : Promise.resolve(0),
  ])

  const limitReached = context.plan === 'starter' && monthlyCount >= PLAN_LIMITS.starter.ordersPerMonth

  if (limitReached) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Nouvelle commande</h1>
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-12">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1C1917] mb-2">Limite atteinte pour ce mois</h2>
          <p className="text-sm text-[#78716C] mb-6 max-w-sm mx-auto">
            Tu as atteint les {PLAN_LIMITS.starter.ordersPerMonth} commandes incluses dans ton plan Starter. Passe au plan Pro pour des commandes illimitées.
          </p>
          <a
            href={getUpgradeWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Passer au plan Pro
          </a>
          <div className="mt-4">
            <Link href="/orders" className="text-sm text-[#78716C] hover:text-[#1C1917]">
              Retour aux commandes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <NewOrderForm
      products={(productsResult.data ?? []) as Product[]}
      createOrder={createOrder}
      initialCustomer={customerResult.data ?? undefined}
    />
  )
}
