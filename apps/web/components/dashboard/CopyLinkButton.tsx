'use client'

import { useRouter } from 'next/navigation'
import { Link as LinkIcon } from 'lucide-react'

type Props = {
  slug?: string | null
}

export default function CopyLinkButton({ slug }: Props) {
  const router = useRouter()

  function handleClick() {
    if (!slug) {
      router.push('/settings?tab=link')
      return
    }
    navigator.clipboard?.writeText(`${window.location.origin}/order/${slug}`).catch(() => {})
    fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_copied' }),
    }).catch(() => {})
  }

  return (
    <button
      onClick={handleClick}
      title={slug ? 'Copier le lien public' : 'Créer votre lien de commande'}
      className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors text-center w-full"
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
