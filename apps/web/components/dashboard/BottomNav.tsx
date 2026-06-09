'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  Users2,
} from 'lucide-react'
import type { UserRole } from '@/lib/get-context'
import { useMobileNav } from '@/lib/mobile-nav-context'
import { usePendingOrdersCount } from './usePendingOrdersCount'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const PRIMARY_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, roles: ['admin', 'operator', 'readonly'] },
  { href: '/orders',    label: 'Commandes',  icon: ShoppingBag,     roles: ['admin', 'operator', 'readonly'] },
  { href: '/customers', label: 'Clients',    icon: Users,           roles: ['admin', 'operator', 'readonly'] },
  { href: '/catalog',   label: 'Catalogue',  icon: Package,         roles: ['admin', 'operator'] },
]

const MORE_ITEMS: NavItem[] = [
  { href: '/deliveries', label: 'Livraisons',  icon: Truck,    roles: ['admin', 'operator'] },
  { href: '/analytics',  label: 'Analytiques', icon: BarChart2, roles: ['admin', 'readonly'] },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,  roles: ['admin'] },
]

type Props = { role: UserRole; plan?: string }

export default function BottomNav({ role, plan = 'starter' }: Props) {
  const pathname = usePathname()
  const { isSheetOpen, openSheet, closeSheet } = useMobileNav()
  const pendingCount = usePendingOrdersCount()
  const hasTeamAccess = plan === 'pro' || plan === 'business'

  const primaryItems = PRIMARY_ITEMS.filter(item => item.roles.includes(role))
  const moreItems    = MORE_ITEMS.filter(item => item.roles.includes(role))
  const showTeam     = role === 'admin'

  const isMoreActive =
    moreItems.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`)) ||
    pathname === '/team' ||
    pathname.startsWith('/team/')

  return (
    <>
      {/* ── Sheet overlay ── */}
      <div
        aria-hidden={!isSheetOpen}
        onClick={closeSheet}
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          isSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ── Sheet panel (slide depuis le bas) ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[61] md:hidden bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-in-out ${
          isSheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-[#E7E5E4] rounded-full mx-auto mt-3 mb-2" />

        <nav className="px-3 pb-3 space-y-0.5">
          {moreItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSheet}
                className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-[#F0FDF4] text-[#16A34A]'
                    : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {showTeam && (
            <Link
              href={hasTeamAccess ? '/team' : '/settings?tab=abonnement'}
              onClick={closeSheet}
              className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium transition-colors min-h-[44px] ${
                pathname === '/team' || pathname.startsWith('/team/')
                  ? 'bg-[#F0FDF4] text-[#16A34A]'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
              }`}
            >
              <Users2 className="h-5 w-5 shrink-0" />
              <span className="flex-1">Équipe</span>
              {!hasTeamAccess && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                  Pro
                </span>
              )}
            </Link>
          )}
        </nav>
      </div>

      {/* ── Bottom nav bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-[#E7E5E4] flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primaryItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isOrders = item.href === '/orders'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center h-16 gap-0.5 transition-colors ${
                isActive ? 'text-[#16A34A]' : 'text-[#78716C]'
              }`}
            >
              <span className={`relative inline-flex items-center justify-center rounded-lg px-3 py-1 transition-colors ${
                isActive ? 'bg-[#F0FDF4]' : ''
              }`}>
                <Icon className="h-5 w-5" />
                {isOrders && pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          )
        })}

        {/* Bouton Plus */}
        <button
          type="button"
          onClick={() => isSheetOpen ? closeSheet() : openSheet()}
          aria-expanded={isSheetOpen}
          aria-label="Ouvrir le menu plus"
          className={`flex-1 flex flex-col items-center justify-center h-16 gap-0.5 transition-colors ${
            isMoreActive || isSheetOpen ? 'text-[#16A34A]' : 'text-[#78716C]'
          }`}
        >
          <span className={`inline-flex items-center justify-center rounded-lg px-3 py-1 transition-colors ${
            isMoreActive || isSheetOpen ? 'bg-[#F0FDF4]' : ''
          }`}>
            <MoreHorizontal className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium mt-0.5">Plus</span>
        </button>
      </nav>
    </>
  )
}
