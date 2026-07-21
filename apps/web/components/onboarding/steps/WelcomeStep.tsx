'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { saveWelcomeStep } from '@/app/(onboarding)/setup/actions'

type Props = {
  initialShopName: string
  onSaved: (result: { shop_name: string; slug: string | null }) => void
}

export default function WelcomeStep({ initialShopName, onSaved }: Props) {
  const [shopName, setShopName] = useState(initialShopName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    if (!shopName.trim()) return
    setIsLoading(true)
    setError(null)
    const result = await saveWelcomeStep({ shop_name: shopName.trim() })
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved({ shop_name: shopName.trim(), slug: result.slug ?? null })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Créons votre boutique
        </h1>
        <p className="text-gray-500 mt-2">
          Ça prend moins de 2 minutes. Promis.
        </p>
      </div>

      <div>
        <label htmlFor="onboarding-shop-name" className="block text-sm font-medium text-gray-700 mb-2">
          Quel est le nom de votre boutique ?
        </label>
        <input
          id="onboarding-shop-name"
          type="text"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
          placeholder="Ex: Boutique Sarra, Moda Tunis..."
          className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          maxLength={50}
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Vous pourrez le modifier à tout moment
        </p>
      </div>

      {shopName.trim() && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Aperçu dans votre boutique :</p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0"
              style={{ backgroundColor: '#16a34a' }}
            >
              {shopName.trim()[0].toUpperCase()}
            </div>
            <span className="font-bold text-gray-900 truncate">{shopName.trim()}</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!shopName.trim() || isLoading}
        className="btn-primary w-full py-3.5 text-base rounded-2xl disabled:opacity-50"
      >
        {isLoading ? 'Enregistrement...' : 'Continuer →'}
      </button>
    </div>
  )
}
