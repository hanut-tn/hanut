'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/get-context'
import { useMobileNav } from '@/lib/mobile-nav-context'

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  admin:    { label: 'Admin',         cls: 'bg-green-100 text-green-700' },
  operator: { label: 'Opérateur',     cls: 'bg-blue-100 text-blue-700'  },
  readonly: { label: 'Lecture seule', cls: 'bg-gray-100 text-gray-600'  },
}

interface TopBarProps {
  sellerName: string
  role: UserRole
  isSeller: boolean
}

export default function TopBar({ sellerName, role, isSeller }: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { isDrawerOpen, openDrawer, closeDrawer } = useMobileNav()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const badge = ROLE_BADGE[role]

  return (
    <header className="h-14 shrink-0 bg-white border-b border-[#E7E5E4] flex items-center px-4 md:px-6 gap-3">

      {/* ── Mobile : bouton hamburger ── */}
      <button
        type="button"
        onClick={isDrawerOpen ? closeDrawer : openDrawer}
        aria-label={isDrawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        className="md:hidden h-10 w-10 flex items-center justify-center rounded-lg border border-[#E7E5E4] text-[#1C1917] hover:bg-[#F5F5F4] transition-colors shrink-0"
      >
        {isDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Logo centré mobile / spacer desktop ── */}
      <div className="flex-1 flex items-center justify-center md:justify-start">
        <span className="font-bold text-[#0B5E46] text-base md:hidden">Hanut</span>
      </div>

      {/* ── Droite : nom vendeur + badge rôle + déconnexion ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Nom + badge — desktop seulement */}
        <span className="hidden sm:inline text-sm text-[#78716C]">
          Bonjour,{' '}
          <span className="font-medium text-[#1C1917]">{sellerName}</span>
        </span>
        {!isSeller && (
          <span className={`hidden sm:inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        )}

        {/* Déconnexion mobile : icône seule */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Déconnexion"
          className="md:hidden h-10 w-10 flex items-center justify-center rounded-lg border border-[#E7E5E4] text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>

        {/* Déconnexion desktop : texte */}
        <button
          type="button"
          onClick={handleLogout}
          className="hidden md:inline-flex items-center border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#1C1917] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
