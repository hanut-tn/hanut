'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Users, Package, Truck, BarChart2, Settings } from 'lucide-react'
import type { UserRole } from '@/lib/get-context'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin'] as UserRole[] },
  { href: '/orders',     label: 'Commandes',   icon: ShoppingBag,     roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/customers',  label: 'Clients',     icon: Users,           roles: ['admin', 'operator', 'readonly'] as UserRole[] },
  { href: '/catalog',    label: 'Catalogue',   icon: Package,         roles: ['admin', 'operator'] as UserRole[] },
  { href: '/deliveries', label: 'Livraisons',  icon: Truck,           roles: ['admin', 'operator'] as UserRole[] },
  { href: '/analytics',  label: 'Analytiques', icon: BarChart2,       roles: ['admin', 'readonly'] as UserRole[] },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,        roles: ['admin'] as UserRole[] },
]

const PLAN_BADGE: Record<string, string> = {
  starter:  'bg-gray-100 text-gray-600',
  pro:      'bg-blue-100 text-blue-700',
  business: 'bg-[#0B5E46] text-white',
}

type Props = {
  role: UserRole
  sellerName?: string
  plan?: string
}

export default function Sidebar({ role, sellerName, plan = 'starter' }: Props) {
  const pathname = usePathname()
  const visible = NAV_ITEMS.filter(item => item.roles.includes(role))
  const initials = sellerName
    ? sellerName.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="w-56 bg-white border-r border-[#E7E5E4] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[#E7E5E4]">
        <span className="text-[#16A34A] text-lg leading-none">●</span>
        <span className="font-bold text-xl text-[#0B5E46]">Hanut</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wider px-3 mb-2">Menu</p>
        <div className="space-y-0.5">
          {visible.map(item => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F0FDF4] text-[#166534]'
                    : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#166534]' : 'text-[#78716C]'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom — user info */}
      <div className="border-t border-[#E7E5E4] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#1C1917] truncate">{sellerName ?? '—'}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${PLAN_BADGE[plan] ?? PLAN_BADGE.starter}`}>
              {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Starter'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
