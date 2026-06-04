import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ShoppingBag, Clock, Truck, Plus, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { relativeDate, initials } from '@/lib/utils'

type Context = { sellerId: string }
type Relation<T> = T | T[] | null
type CustomerSummary = { name: string; phone: string }
type ProductSummary = { name: string }
type OperatorOrder = {
  id: string
  status: string
  variant?: string | null
  created_at: string
  customer: Relation<CustomerSummary>
  product: Relation<ProductSummary>
}

export async function OperatorDashboard({ context }: { context: Context }) {
  const supabase = await createServerClient()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    { count: todayCount },
    { count: pendingCount },
    { count: shippedTodayCount },
    { data: todayOrders },
  ] = await Promise.all([
    supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('seller_id', context.sellerId).is('deleted_at', null)
      .gte('created_at', startOfToday.toISOString()),
    supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('seller_id', context.sellerId).in('status', ['pending', 'new']).is('deleted_at', null),
    supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('seller_id', context.sellerId).eq('status', 'shipped').is('deleted_at', null)
      .gte('updated_at', startOfToday.toISOString()),
    supabase
      .from('orders')
      .select('id, status, variant, created_at, customer:customers(name, phone), product:products(name)')
      .eq('seller_id', context.sellerId).is('deleted_at', null)
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const todayOrderRows = (todayOrders ?? []) as OperatorOrder[]

  const kpis = [
    {
      label: "Commandes aujourd'hui",
      value: String(todayCount ?? 0),
      icon: ShoppingBag,
      valueClass: 'text-[#1C1917]',
    },
    {
      label: 'En attente',
      value: String(pendingCount ?? 0),
      icon: Clock,
      valueClass: (pendingCount ?? 0) > 0 ? 'text-amber-600' : 'text-[#1C1917]',
      sub: 'nécessitent une action',
    },
    {
      label: "Expédiées aujourd'hui",
      value: String(shippedTodayCount ?? 0),
      icon: Truck,
      valueClass: 'text-[#16A34A]',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Tableau de bord</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Activité d&apos;aujourd&apos;hui</p>
        </div>
        <Link href="/orders/new" className="btn-primary w-full text-center text-sm sm:w-auto">+ Nouvelle commande</Link>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white border border-[#E7E5E4] rounded-xl p-2 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs sm:text-sm font-medium text-[#78716C] leading-tight">{kpi.label}</p>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#78716C] shrink-0" />
              </div>
              <p className={`text-xl sm:text-3xl font-bold mt-2 ${kpi.valueClass}`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-[#78716C] mt-1">{kpi.sub}</p>}
            </div>
          )
        })}
      </div>

      {/* Actions rapides */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#1C1917] mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: '/orders/new',  label: 'Nouvelle commande',      icon: Plus },
            { href: '/orders',      label: 'Toutes les commandes',   icon: ShoppingBag },
            { href: '/catalog',     label: 'Catalogue',              icon: ChevronRight },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors text-center"
            >
              <div className="w-9 h-9 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#16A34A]" />
              </div>
              <span className="text-xs font-medium text-[#1C1917] leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Commandes du jour */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-[#1C1917]">Commandes d&apos;aujourd&apos;hui</h2>
          <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
            Voir tout →
          </Link>
        </div>

        {todayOrderRows.length === 0 ? (
          <div className="text-center py-12 text-[#78716C]">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
            <p className="font-medium text-[#1C1917]">Aucune commande aujourd&apos;hui</p>
            <p className="text-sm mt-1">Les nouvelles commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {todayOrderRows.map(order => {
              const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
              const product = Array.isArray(order.product) ? order.product[0] : order.product
              const ini = customer?.name ? initials(customer.name) : '?'
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-[#FAFAF9] -mx-6 px-6 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-xs shrink-0 select-none">
                    {ini}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1917] text-sm truncate">{customer?.name ?? '—'}</p>
                    <p className="text-xs text-[#78716C] truncate">{product?.name ?? '—'}{order.variant ? ` · ${order.variant}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#78716C]">{relativeDate(order.created_at)}</p>
                  </div>
                  <span className="hidden sm:inline-flex">
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
