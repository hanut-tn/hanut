'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/get-context'

const ROLE_BADGE: Record<UserRole, { label: string; cls: string; tooltip: string }> = {
  admin:    { label: 'Admin',         cls: 'bg-green-100 text-green-700',  tooltip: 'Accès complet à la boutique' },
  operator: { label: 'Opérateur',     cls: 'bg-blue-100 text-blue-700',   tooltip: 'Peut créer et modifier les commandes' },
  readonly: { label: 'Lecture seule', cls: 'bg-gray-100 text-gray-600',   tooltip: 'Peut consulter sans modifier' },
}

interface TopBarProps {
  sellerName: string
  role: UserRole
  isSeller: boolean
}

export default function TopBar({ sellerName, role, isSeller }: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const badge = ROLE_BADGE[role]

  return (
    <header className="h-14 bg-white border-b border-[#E7E5E4] flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#78716C]">
            Bonjour, <span className="font-medium text-[#1C1917]">{sellerName}</span>
          </span>
          {!isSeller && (
            <span
              title={badge.tooltip}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-default ${badge.cls}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#1C1917] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
