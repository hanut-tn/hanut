'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
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

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/orders',     label: 'Commandes',   icon: ShoppingBag,     roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/customers',  label: 'Clients',     icon: Users,           roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/catalog',    label: 'Catalogue',   icon: Package,         roles: ['admin', 'operator'] as UserRole[] },
  { href: '/deliveries', label: 'Livraisons',  icon: Truck,           roles: ['admin', 'operator'] as UserRole[] },
  { href: '/analytics',  label: 'Analytiques', icon: BarChart2,       roles: ['admin', 'readonly'] as UserRole[] },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,        roles: ['admin'] as UserRole[] },
]

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}

type Props = { role: UserRole; sellerName: string; plan?: string }

export default function MobileSidebar({ role, sellerName, plan = 'starter' }: Props) {
  const pathname     = usePathname()
  const { isDrawerOpen, closeDrawer } = useMobileNav()
  const pendingCount = usePendingOrdersCount()
  const hasTeamAccess = plan === 'pro' || plan === 'business'
  const visible      = NAV_ITEMS.filter(item => item.roles.includes(role))

  const initials = sellerName
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      aria-hidden={!isDrawerOpen}
      className={`fixed inset-0 z-[70] md:hidden ${isDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={closeDrawer}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer panel */}
      <aside
        className={`relative flex h-dvh w-[280px] max-w-[85vw] flex-col border-r border-[#E7E5E4] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center px-5 h-14 border-b border-[#E7E5E4] shrink-0">
          <Image src="/logo-horizontal.svg" alt="Hanut" width={110} height={35} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wider px-3 mb-2">Menu</p>

          {visible.map(item => {
            const Icon     = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const isOrders = item.href === '/orders'
            const insertTeamAfter = item.href === '/analytics' && role === 'admin'

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeDrawer}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[#F0FDF4] text-[#166534]'
                      : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#166534]' : 'text-[#78716C]'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isOrders && pendingCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Link>

                {insertTeamAfter && (
                  <Link
                    href={hasTeamAccess ? '/team' : '/settings?tab=abonnement'}
                    onClick={closeDrawer}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] mt-0.5 ${
                      pathname.startsWith('/team') && hasTeamAccess
                        ? 'bg-[#F0FDF4] text-[#166534]'
                        : hasTeamAccess
                          ? 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                          : 'text-[#A8A29E]'
                    }`}
                  >
                    <Users2 className={`w-5 h-5 shrink-0 ${
                      pathname.startsWith('/team') && hasTeamAccess ? 'text-[#166534]' : hasTeamAccess ? 'text-[#78716C]' : 'text-[#A8A29E]'
                    }`} />
                    <span className="flex-1">Équipe</span>
                    {!hasTeamAccess && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534] border border-green-200">
                        Pro
                      </span>
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer — user info */}
        <div className="border-t border-[#E7E5E4] px-4 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1C1917] truncate">{sellerName}</p>
              <p className="text-xs text-[#78716C]">{PLAN_LABEL[plan] ?? plan}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
