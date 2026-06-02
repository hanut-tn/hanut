'use client'

import { Link as LinkIcon } from 'lucide-react'

type Props = {
  slug?: string | null
}

export default function CopyLinkButton({ slug }: Props) {
  function handleCopy() {
    if (!slug) return
    const url = `${window.location.origin}/order/${slug}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!slug}
      title={slug ? 'Copier le lien public' : 'Créez d’abord votre lien dans Paramètres'}
      className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center w-full"
    >
      <div className="w-9 h-9 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
        <LinkIcon className="w-5 h-5 text-[#16A34A]" />
      </div>
      <span className="text-xs font-medium text-[#1C1917] leading-tight">
        {slug ? 'Copier mon lien' : 'Créer mon lien'}
      </span>
    </button>
  )
}
