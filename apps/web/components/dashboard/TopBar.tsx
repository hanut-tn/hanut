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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Bonjour, <span className="font-medium text-gray-900">{sellerName}</span>
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
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
