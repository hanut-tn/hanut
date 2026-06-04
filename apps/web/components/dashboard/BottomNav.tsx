'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { useState } from 'react'

import type { UserRole } from '@/lib/get-context'
import { usePendingOrdersCount } from './usePendingOrdersCount'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const PRIMARY_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'operator', 'readonly'] },
  { href: '/orders', label: 'Commandes', icon: ShoppingBag, roles: ['admin', 'operator', 'readonly'] },
  { href: '/customers', label: 'Clients', icon: Users, roles: ['admin', 'operator', 'readonly'] },
  { href: '/catalog', label: 'Catalogue', icon: Package, roles: ['admin', 'operator'] },
]

const MORE_ITEMS: NavItem[] = [
  { href: '/deliveries', label: 'Livraisons', icon: Truck, roles: ['admin', 'operator'] },
  { href: '/analytics', label: 'Analytiques', icon: BarChart2, roles: ['admin', 'readonly'] },
  { href: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
]

type BottomNavProps = {
  role: UserRole
  plan?: string
}

export default function BottomNav({ role, plan = 'starter' }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const pendingCount = usePendingOrdersCount()
  const isBusiness = plan === 'business'

  const primaryItems = PRIMARY_ITEMS.filter((item) => item.roles.includes(role))
  const moreItems = MORE_ITEMS.filter((item) => item.roles.includes(role))
  const showTeam = role === 'admin'
  const isMoreActive =
    moreItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ||
    pathname === '/team' ||
    pathname.startsWith('/team/')

  const closeMore = () => setMoreOpen(false)

  const handleTeamClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isBusiness) {
      event.preventDefault()
      setMoreOpen(false)
      router.push('/settings?tab=abonnement')
      return
    }

    setMoreOpen(false)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[55] md:hidden ${moreOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!moreOpen}
      >
        <button
          type="button"
          aria-label="Fermer le menu plus"
          onClick={closeMore}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            moreOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 border-t border-[#E7E5E4] bg-white px-4 pb-4 pt-3 transition-transform duration-300 ${
            moreOpen ? 'translate-y-0' : 'translate-y-[calc(100%+4rem)]'
          }`}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D6D3D1]" />
          <div className="space-y-1">
            {moreItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMore}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F0FDF4] text-[#16A34A]'
                      : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              )
            })}

            {showTeam && (
              <Link
                href={isBusiness ? '/team' : '/settings?tab=abonnement'}
                onClick={handleTeamClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  pathname === '/team' || pathname.startsWith('/team/')
                    ? 'bg-[#F0FDF4] text-[#16A34A]'
                    : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                }`}
              >
                <Users2 className="h-5 w-5" />
                <span className="flex-1">Équipe</span>
                {!isBusiness && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                    Business
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 grid h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-[#E7E5E4] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${primaryItems.length + 1}, minmax(0, 1fr))` }}
      >
        {primaryItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isOrders = item.href === '/orders'

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMore}
              className={`flex flex-col items-center justify-center gap-0.5 ${
                isActive ? 'text-[#16A34A]' : 'text-[#78716C]'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isOrders && pendingCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((current) => !current)}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            isMoreActive || moreOpen ? 'text-[#16A34A]' : 'text-[#78716C]'
          }`}
          aria-expanded={moreOpen}
          aria-label="Ouvrir le menu plus"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Plus</span>
        </button>
      </nav>
    </>
  )
}
