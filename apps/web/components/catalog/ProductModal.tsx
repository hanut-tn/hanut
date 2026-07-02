'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Plus, Trash2 } from 'lucide-react'
import type { Product, ProductVariant } from '@hanut/types'
import type { ProductInput } from '@/app/(dashboard)/catalog/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'

type Props = {
  product: Product | null
  onClose: () => void
  onSave: (input: ProductInput) => Promise<{ error?: string }>
}

const EMPTY: ProductInput = {
  name: '',
  price: 0,
  cost: null,
  stock: 0,
  low_stock_alert: 3,
  variants: [],
  image_url: null,
  description: '',
}

export default function ProductModal({ product, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          id: product.id,
          name: product.name,
          price: product.price,
          cost: product.cost ?? null,
          stock: product.stock,
          low_stock_alert: product.low_stock_alert,
          variants: product.variants,
          image_url: product.image_url ?? null,
          description: product.description ?? '',
        }
      : { ...EMPTY }
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fermer avec Escape (sauf pendant l'enregistrement)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saving, onClose])

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleImageFile(file: File) {
    setImageError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Format non autorisé. Utilisez JPG, PNG, WebP ou HEIC uniquement.')
      return
    }
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setImageError('Extension non autorisée. Utilisez .jpg, .png, .webp, .heic ou .heif uniquement.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image trop lourde. Maximum 5 Mo.")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
    set('image_url', null)
  }

  function addVariant() {
    set('variants', [...form.variants, { size: '', color: '', qty: 1 }])
  }

  function updateVariant(i: number, field: keyof ProductVariant, value: string | number) {
    set('variants', form.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }

  function removeVariant(i: number) {
    set('variants', form.variants.filter((_, idx) => idx !== i))
  }

  const margin = form.cost && form.price > 0
    ? Math.round(((form.price - form.cost) / form.price) * 100)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const finalForm = { ...form }
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const { url, error: uploadError } = await uploadProductImage(fd)
        if (uploadError) throw new Error(uploadError)
        finalForm.image_url = url ?? null
      }
      const result = await onSave(finalForm)
      if (result?.error) throw new Error(result.error)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:p-4">
      <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:mx-auto sm:my-8 sm:min-h-0 sm:max-h-[calc(100svh-4rem)] sm:max-w-2xl sm:rounded-xl sm:border sm:border-[#E7E5E4]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-[#1C1917]">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] w-10 h-10 touch-manipulation flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            {/* Two-column: image left, fields right */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-2">
                  Photo du produit
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors cursor-pointer ${
                    isDragOver ? 'border-[#16A34A] bg-green-50' : 'border-[#E7E5E4] hover:border-[#16A34A]/50'
                  }`}
                  style={{ minHeight: 200 }}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <div
                        aria-label="Aperçu du produit"
                        role="img"
                        className="w-full bg-cover bg-center"
                        style={{ height: 200, backgroundImage: `url(${imagePreview})` }}
                      />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeImage() }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-center px-4" style={{ height: 200 }}>
                      <Upload className="w-7 h-7 text-[#78716C]" />
                      <p className="text-sm text-[#78716C]">Glissez une photo ici</p>
                      <p className="text-xs text-[#78716C]">
                        ou{' '}
                        <span className="text-[#16A34A] font-medium underline">parcourir</span>
                      </p>
                      <p className="text-xs text-[#A8A29E]">JPG, PNG, WebP, HEIC — max 5 Mo</p>
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs text-[#16A34A] hover:text-[#15803D] font-medium"
                  >
                    Changer la photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
                />
                {imageError && (
                  <p className="mt-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                    {imageError}
                  </p>
                )}
              </div>

              {/* Main fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">
                    Nom du produit <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Ex: T-shirt oversize"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">
                      Prix de vente (DT) <span className="text-red-500">*</span>
                    </label>
                    <input
                    className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price || ''}
                      onChange={e => set('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">
                      Prix d&apos;achat (DT)
                    </label>
                    <input
                    className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost ?? ''}
                      onChange={e => set('cost', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Ex: 25 DT"
                    />
                    <p className="mt-1 text-xs text-[#78716C]">Le prix auquel vous achetez ce produit. Utilisé pour calculer votre marge.</p>
                  </div>
                </div>

                {margin !== null && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                    <span>Marge :</span>
                    <strong>{margin}%</strong>
                    <span className="text-green-600">
                      ({(form.price - (form.cost ?? 0)).toFixed(2)} DT/vente)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">
                      Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                    className="input"
                      type="number"
                      min="0"
                      value={form.stock || ''}
                      onChange={e => set('stock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">
                      Alerte stock bas
                    </label>
                    <input
                    className="input"
                      type="number"
                      min="0"
                      value={form.low_stock_alert || ''}
                      onChange={e => set('low_stock_alert', parseInt(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                placeholder="Description du produit..."
              />
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#1C1917]">Variantes</label>
                <button
                  type="button"
                  onClick={addVariant}
                  className="min-h-[44px] touch-manipulation text-xs text-[#16A34A] hover:text-[#15803D] font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une variante
                </button>
              </div>
              {form.variants.length > 0 && (
                <div className="space-y-2">
                  {/* En-tête desktop uniquement */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_44px] gap-2 px-1">
                    <span className="text-xs text-[#78716C]">Taille</span>
                    <span className="text-xs text-[#78716C]">Couleur</span>
                    <span className="text-xs text-[#78716C]">Qté</span>
                    <span />
                  </div>
                  {form.variants.map((v, i) => (
                    <div key={i}>
                      {/* Mobile : carte empilée */}
                      <div className="sm:hidden rounded-xl border border-[#E7E5E4] p-3 space-y-2">
                        <div className="grid grid-cols-[1fr_44px] gap-2 items-center">
                          <input
                            className="input"
                            value={v.size ?? ''}
                            onChange={e => updateVariant(i, 'size', e.target.value)}
                            placeholder="Taille (M, L, XL…)"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="flex min-h-[44px] touch-manipulation items-center justify-center text-[#78716C] hover:text-red-500 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-[1fr_80px] gap-2">
                          <input
                            className="input"
                            value={v.color ?? ''}
                            onChange={e => updateVariant(i, 'color', e.target.value)}
                            placeholder="Couleur (Noir, Blanc…)"
                          />
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={v.qty}
                            onChange={e => updateVariant(i, 'qty', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      {/* Desktop : ligne grille */}
                      <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_44px] gap-2 items-center">
                        <input
                          className="input"
                          value={v.size ?? ''}
                          onChange={e => updateVariant(i, 'size', e.target.value)}
                          placeholder="M, L, XL…"
                        />
                        <input
                          className="input"
                          value={v.color ?? ''}
                          onChange={e => updateVariant(i, 'color', e.target.value)}
                          placeholder="Noir, Blanc…"
                        />
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={v.qty}
                          onChange={e => updateVariant(i, 'qty', parseInt(e.target.value) || 0)}
                        />
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="flex min-h-[44px] touch-manipulation items-center justify-center text-[#78716C] hover:text-red-500 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 sm:mx-6">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
