import { createServiceClient } from '@/lib/supabase/service'
import OrderForm from '@/components/order/OrderForm'
import type { Product } from '@hanut/types'
import Link from 'next/link'
import { SearchX } from 'lucide-react'

type Props = { params: Promise<{ slug: string }> }

export default async function PublicOrderPage({ params }: Props) {
  const { slug } = await params

  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Page temporairement indisponible</h1>
        <p className="text-gray-500 max-w-sm">Contactez le vendeur directement.</p>
      </div>
    )
  }

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-4 text-center">
        <SearchX className="w-12 h-12 text-[#78716C] mb-4" />
        <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Boutique introuvable</h1>
        <p className="text-gray-500 max-w-sm">
          Le lien que vous avez suivi ne correspond à aucune boutique active sur Hanut.
        </p>
        <p className="text-sm text-gray-400 mt-6">
          Vérifiez le lien avec le vendeur et réessayez.
        </p>
      </div>
    )
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, variants, image_url')
    .eq('seller_id', seller.id)
    .gt('stock', 0)
    .order('name')

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 bg-[#0B5E46] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          <p className="font-bold text-[#1C1917] truncate">{seller.name}</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-xl mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {(products ?? []).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="font-medium text-gray-700">Catalogue vide pour l&apos;instant</p>
            <p className="text-sm text-gray-400 mt-1">Revenez bientôt, le vendeur prépare ses produits.</p>
          </div>
        ) : (
          <OrderForm
            sellerSlug={slug}
            sellerName={seller.name}
            products={(products ?? []) as Product[]}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-100 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <div className="w-4 h-4 bg-[#0B5E46] rounded flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: '9px' }}>H</span>
          </div>
          Propulsé par Hanut
        </Link>
      </footer>
    </div>
  )
}
