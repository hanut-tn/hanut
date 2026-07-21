'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Eye, PartyPopper } from 'lucide-react'

type Props = {
  sellerName: string
  slug: string | null
  onFinish: () => void
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.115 1.522 5.847L0 24l6.347-1.498A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.007-1.37l-.359-.213-3.72.877.894-3.629-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  )
}

export default function LiveStep({ sellerName, slug, onFinish }: Props) {
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // URL relative pour la navigation interne (voir ma boutique), même
  // convention que BoutiqueEditor.tsx (href={`/s/${slug}`}). Pour le partage
  // externe (copie, WhatsApp) il faut une URL absolue — construite depuis
  // l'origine réelle de la requête plutôt qu'un domaine en dur, pour rester
  // correcte en dev/preview/prod sans dupliquer la configuration.
  const path = slug ? `/s/${slug}` : null
  const absoluteUrl = path && typeof window !== 'undefined' ? `${window.location.origin}${path}` : null

  function handleCopy() {
    if (!absoluteUrl) return
    navigator.clipboard.writeText(absoluteUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  function handleWhatsApp() {
    if (!absoluteUrl) return
    const msg = encodeURIComponent(
      `🛍️ Ma boutique est en ligne !\n\nCommandez directement : ${absoluteUrl}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  async function handleFinish() {
    setIsLoading(true)
    await onFinish()
    // onFinish redirige vers /dashboard ; pas de setIsLoading(false) après
    // succès pour éviter un flash de bouton réactivé pendant la navigation.
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
          <PartyPopper className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Votre boutique est live !
        </h2>
        <p className="text-gray-500 mt-2">
          Partagez ce lien avec vos clients maintenant
        </p>
      </div>

      <div className="border-2 border-brand-200 rounded-2xl overflow-hidden bg-brand-50">
        <div className="bg-brand-600 text-white text-xs font-medium px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          En ligne maintenant
        </div>
        <div className="p-4">
          <p className="text-sm text-brand-700 font-medium break-all">
            {absoluteUrl ?? `Boutique de ${sellerName}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!absoluteUrl}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-medium text-sm transition-all disabled:opacity-50 ${
            isCopied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copié !' : 'Copier le lien'}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={!absoluteUrl}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#25D366' }}
        >
          <WhatsAppIcon className="w-4 h-4" />
          WhatsApp
        </button>
      </div>

      {path && (
        <Link
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Voir ma boutique
        </Link>
      )}

      <button
        type="button"
        onClick={handleFinish}
        disabled={isLoading}
        className="btn-primary w-full py-3.5 rounded-2xl disabled:opacity-50"
      >
        {isLoading ? 'Chargement...' : 'Accéder à mon tableau de bord →'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Vous pourrez ajouter plus de produits, personnaliser votre boutique et gérer vos commandes depuis le tableau de bord
      </p>
    </div>
  )
}
