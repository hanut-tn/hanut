'use client'

import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/get-context'
import { useMobileSidebar } from './MobileSidebarContext'

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
  const { isOpen, toggle } = useMobileSidebar()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const badge = ROLE_BADGE[role]

  return (
    <header className="h-14 bg-white border-b border-[#E7E5E4] flex items-center justify-between px-4 md:px-6 shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isOpen}
        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E7E5E4] text-[#1C1917] transition-colors hover:bg-[#F5F5F4]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-sm text-[#78716C] sm:inline">
            Bonjour, <span className="font-medium text-[#1C1917]">{sellerName}</span>
          </span>
          <span className="max-w-[9rem] truncate text-sm font-medium text-[#1C1917] sm:hidden">
            {sellerName}
          </span>
          {!isSeller && (
            <span
              title={badge.tooltip}
              className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-default ${badge.cls}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#1C1917] rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
