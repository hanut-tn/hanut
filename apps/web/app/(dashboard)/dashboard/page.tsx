import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role !== 'admin') redirect('/orders')

  const supabase = await createServerClient()
  const [{ count: totalOrders }, { data: delivered }, { data: allOrders }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId),
    supabase.from('orders').select('cod_amount').eq('seller_id', context.sellerId).eq('status', 'delivered'),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId),
  ])

  const revenue = ((delivered ?? []) as { cod_amount: number }[]).reduce((s, o) => s + o.cod_amount, 0)
  const all = (allOrders ?? []) as { status: string }[]
  const shipped = all.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status)).length
  const deliveryRate = shipped > 0 ? Math.round((all.filter(o => o.status === 'delivered').length / shipped) * 100) : 0

  const stats = [
    { label: 'Commandes', value: String(totalOrders ?? 0), sub: 'toutes périodes', icon: '📦', bg: 'bg-blue-50 text-blue-700' },
    { label: 'CA livré', value: `${revenue.toFixed(0)} DT`, sub: 'commandes livrées', icon: '💰', bg: 'bg-green-50 text-green-700' },
    { label: 'Taux livraison', value: `${deliveryRate}%`, sub: 'expéditions', icon: '🚚', bg: 'bg-purple-50 text-purple-700' },
    { label: 'COD en attente', value: '0 DT', sub: 'non reversé', icon: '💵', bg: 'bg-orange-50 text-orange-700' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d&apos;ensemble de votre activité</p>
        </div>
        <Link href="/orders/new" className="btn-primary">+ Nouvelle commande</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${s.bg}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Voir tout →</Link>
        </div>
        <RecentOrders sellerId={context.sellerId} />
      </div>
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: 'Nouvelle',  cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmée', cls: 'bg-yellow-100 text-yellow-700' },
  shipped:   { label: 'Expédiée',  cls: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée',    cls: 'bg-green-100 text-green-700' },
  returned:  { label: 'Retournée', cls: 'bg-red-100 text-red-700' },
}

async function RecentOrders({ sellerId }: { sellerId: string }) {
  const supabase = await createServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, cod_amount, status, variant, created_at, customer:customers(name,phone), product:products(name)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-medium text-gray-500">Aucune commande pour l&apos;instant</p>
        <p className="text-sm mt-1">Créez votre première commande ci-dessus</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Client', 'Produit', 'Montant', 'Statut', 'Date'].map(h => (
              <th key={h} className="text-left font-medium text-gray-500 pb-3 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(orders as any[]).map((order) => {
            const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
            const product  = Array.isArray(order.product)  ? order.product[0]  : order.product
            const st = STATUS[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-900">{customer?.name ?? '—'}</p>
                  <p className="text-gray-400 text-xs">{customer?.phone}</p>
                </td>
                <td className="py-3 pr-4">
                  <p className="text-gray-700">{product?.name ?? '—'}</p>
                  {order.variant && <p className="text-gray-400 text-xs">{order.variant}</p>}
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900">{order.cod_amount} DT</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                </td>
                <td className="py-3 text-gray-400 text-xs">
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
