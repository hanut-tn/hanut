'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Package, Upload, X } from 'lucide-react'
import { saveProductStep } from '@/app/(onboarding)/setup/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'

type Props = {
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

export default function ProductStep({ onNext, onSkip, onBack }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('10')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadProductImage(fd)
    setIsUploading(false)
    if (result.error || !result.url) {
      setError(result.error ?? "Échec de l'upload")
      return
    }
    setImageUrl(result.url)
  }

  async function handleNext() {
    const parsedPrice = parseFloat(price)
    if (!name.trim() || !price || Number.isNaN(parsedPrice)) return
    setIsLoading(true)
    setError(null)
    const result = await saveProductStep({
      name: name.trim(),
      price: parsedPrice,
      stock: parseInt(stock, 10) || 0,
      image_url: imageUrl,
    })
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Package className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Ajoutez votre premier produit
        </h2>
        <p className="text-gray-500 mt-2">
          Commencez avec un seul produit — vous pourrez en ajouter d&apos;autres ensuite
        </p>
      </div>

      <div>
        {imageUrl ? (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden">
            <Image src={imageUrl} alt="" fill sizes="512px" className="object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Retirer la photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-brand-400 transition-colors bg-gray-50">
            <Upload className="w-6 h-6 mb-2 text-gray-400" />
            <span className="text-sm text-gray-500">{isUploading ? 'Envoi en cours…' : 'Ajouter une photo'}</span>
            <span className="text-xs text-gray-400">(optionnel)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
              className="hidden"
              disabled={isUploading}
              onChange={handleImageUpload}
            />
          </label>
        )}
      </div>

      <div>
        <label htmlFor="onboarding-product-name" className="block text-sm font-medium text-gray-700 mb-2">
          Nom du produit *
        </label>
        <input
          id="onboarding-product-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Robe d'été, Parfum Rose..."
          className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-brand-500"
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="onboarding-product-price" className="block text-sm font-medium text-gray-700 mb-2">
            Prix (DT) *
          </label>
          <input
            id="onboarding-product-price"
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.5"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="onboarding-product-stock" className="block text-sm font-medium text-gray-700 mb-2">
            Stock disponible
          </label>
          <input
            id="onboarding-product-stock"
            type="number"
            value={stock}
            onChange={e => setStock(e.target.value)}
            min="0"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleNext}
          disabled={!name.trim() || !price || isLoading || isUploading}
          className="btn-primary w-full py-3.5 rounded-2xl disabled:opacity-50"
        >
          {isLoading ? 'Création...' : 'Créer mon produit →'}
        </button>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 py-2">
            ← Retour
          </button>
          <button type="button" onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 py-2">
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  )
}
