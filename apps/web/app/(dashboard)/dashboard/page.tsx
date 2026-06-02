import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingBag, Banknote, TrendingUp, Clock, Inbox } from 'lucide-react'

export default async function DashboardPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role !== 'admin') redirect('/orders')

  const supabase = await createServerClient()
  const [{ count: totalOrders }, { data: delivered }, { data: allOrders }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId).is('deleted_at', null),
    supabase.from('orders').select('cod_amount').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId).is('deleted_at', null),
  ])

  const revenue = ((delivered ?? []) as { cod_amount: number }[]).reduce((s, o) => s + o.cod_amount, 0)
  const all = (allOrders ?? []) as { status: string }[]
  const shipped = all.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status)).length
  const deliveryRate = shipped > 0 ? Math.round((all.filter(o => o.status === 'delivered').length / shipped) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Tableau de bord</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Vue d&apos;ensemble de votre activité</p>
        </div>
        <Link href="/orders/new" className="btn-primary text-sm">+ Nouvelle commande</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Commandes"
          value={String(totalOrders ?? 0)}
          sub="toutes périodes"
          icon={ShoppingBag}
        />
        <KPICard
          label="CA livré"
          value={`${revenue.toFixed(0)} DT`}
          sub="commandes livrées"
          icon={Banknote}
          valueClass="text-[#16A34A]"
        />
        <KPICard
          label="Taux livraison"
          value={`${deliveryRate}%`}
          sub="expéditions"
          icon={TrendingUp}
        />
        <KPICard
          label="COD en attente"
          value="0 DT"
          sub="non reversé"
          icon={Clock}
          valueClass="text-amber-600"
        />
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1C1917]">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium">Voir tout →</Link>
        </div>
        <RecentOrders sellerId={context.sellerId} />
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  valueClass = 'text-[#1C1917]',
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  valueClass?: string
}) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[#78716C]">{label}</p>
        <Icon className="w-5 h-5 text-[#78716C]" />
      </div>
      <p className={`text-3xl font-bold mt-2 ${valueClass}`}>{value}</p>
      <p className="text-xs text-[#78716C] mt-1">{sub}</p>
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  new:       { label: 'Nouvelle',   cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  confirmed: { label: 'Confirmée',  cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
  shipped:   { label: 'Expédiée',   cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  delivered: { label: 'Livrée',     cls: 'bg-green-50 text-green-700 border border-green-200' },
  returned:  { label: 'Retournée',  cls: 'bg-red-50 text-red-700 border border-red-200' },
}

async function RecentOrders({ sellerId }: { sellerId: string }) {
  const supabase = await createServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, cod_amount, status, variant, created_at, customer:customers(name,phone), product:products(name)')
    .eq('seller_id', sellerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-[#78716C]">
        <Inbox className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
        <p className="font-medium text-[#1C1917]">Aucune commande pour l&apos;instant</p>
        <p className="text-sm mt-1">Créez votre première commande ci-dessus</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E7E5E4]">
            {['Client', 'Produit', 'Montant', 'Statut', 'Date'].map(h => (
              <th key={h} className="text-left text-xs font-medium text-[#78716C] pb-3 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E5E4]">
          {(orders as any[]).map((order) => {
            const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
            const product  = Array.isArray(order.product)  ? order.product[0]  : order.product
            const st = STATUS[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <tr key={order.id} className="hover:bg-[#FAFAF9] transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium text-[#1C1917]">{customer?.name ?? '—'}</p>
                  <p className="text-[#78716C] text-xs">{customer?.phone}</p>
                </td>
                <td className="py-3 pr-4">
                  <p className="text-[#1C1917]">{product?.name ?? '—'}</p>
                  {order.variant && <p className="text-[#78716C] text-xs">{order.variant}</p>}
                </td>
                <td className="py-3 pr-4 font-medium text-[#1C1917]">{order.cod_amount} DT</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                </td>
                <td className="py-3 text-[#78716C] text-xs">
                  {new Date(order.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
