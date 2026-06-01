'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/orders', label: 'Commandes', icon: '📦' },
  { href: '/customers', label: 'Clients', icon: '👤' },
  { href: '/catalog', label: 'Catalogue', icon: '🛍️' },
  { href: '/deliveries', label: 'Livraisons', icon: '🚚' },
  { href: '/analytics', label: 'Analytiques', icon: '📈' },
  { href: '/settings', label: 'Paramètres', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow">
          <span className="text-lg font-bold text-white">H</span>
        </div>
        <span className="font-bold text-gray-900 text-lg">Hanut</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
