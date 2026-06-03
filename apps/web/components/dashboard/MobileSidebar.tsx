'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { useMobileSidebar } from './MobileSidebarContext'
import { usePendingOrdersCount } from './usePendingOrdersCount'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/orders', label: 'Commandes', icon: ShoppingBag, roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/customers', label: 'Clients', icon: Users, roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/catalog', label: 'Catalogue', icon: Package, roles: ['admin', 'operator'] as UserRole[] },
  { href: '/deliveries', label: 'Livraisons', icon: Truck, roles: ['admin', 'operator'] as UserRole[] },
  { href: '/analytics', label: 'Analytiques', icon: BarChart2, roles: ['admin', 'readonly'] as UserRole[] },
  { href: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] as UserRole[] },
]

const PLAN_BADGE: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}

type MobileSidebarProps = {
  role: UserRole
  sellerName: string
  plan?: string
}

export default function MobileSidebar({ role, sellerName, plan = 'starter' }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, close } = useMobileSidebar()
  const pendingCount = usePendingOrdersCount()
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const isBusiness = plan === 'business'

  const handleTeamClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isBusiness) {
      event.preventDefault()
      close()
      router.push('/settings?tab=abonnement')
      return
    }

    close()
  }

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={close}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`relative flex h-full w-72 max-w-[85vw] flex-col border-r border-[#E7E5E4] bg-white transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[#E7E5E4] px-5">
          <div className="h-9 w-9 rounded-lg bg-[#0B5E46] flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <div>
            <h1 className="font-semibold text-[#1C1917]">Hanut</h1>
            <p className="text-xs text-[#78716C]">Seller Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const isOrders = item.href === '/orders'
            const insertTeamAfter = item.href === '/analytics' && role === 'admin'

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F0FDF4] text-[#16A34A]'
                      : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {isOrders && pendingCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Link>

                {insertTeamAfter && (
                  <Link
                    href={isBusiness ? '/team' : '/settings?tab=abonnement'}
                    onClick={handleTeamClick}
                    className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#E7E5E4]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#F5F5F4] flex items-center justify-center text-sm font-medium text-[#78716C]">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1C1917] truncate">{sellerName}</p>
              <p className="text-xs text-[#78716C]">{PLAN_BADGE[plan] ?? plan}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
