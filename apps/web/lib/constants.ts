import type { CarrierName, OrderStatus } from '@hanut/types'

export const TUNISIAN_GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
] as const

export type TunisianGovernorate = typeof TUNISIAN_GOVERNORATES[number]

// Premiers chiffres valides : 2x, 4x, 5x, 7x, 9x.
export const TUNISIAN_PHONE_REGEX = /^[24579][0-9]{7}$/

export function formatTunisianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00216')) return digits.slice(5)
  if (digits.startsWith('216')) return digits.slice(3)
  return digits
}

export function isValidTunisianPhone(phone: string): boolean {
  return TUNISIAN_PHONE_REGEX.test(formatTunisianPhone(phone))
}

type OrderStatusConfig = {
  label: string
  bg: string
  text: string
  border: string
  dot: string
}

type CarrierConfig = {
  label: string
  color: string
  bg: string
}

// Statuts actifs dont la suppression restitue le stock.
// Les commandes résolues (delivered/returned/cancelled) sont gérées séparément selon le plan.
export const DELETABLE_STATUSES: OrderStatus[] = ['pending', 'new', 'confirmed']

export const ORDER_STATUSES = ['pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled'] as const satisfies readonly OrderStatus[]

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending:   { label: 'En attente', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  new:       { label: 'Nouvelle',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  confirmed: { label: 'Confirmée',  bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500'    },
  shipped:   { label: 'Expédiée',   bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  delivered: { label: 'Livrée',     bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  returned:  { label: 'Retournée',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
  cancelled: { label: 'Annulée',    bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   dot: 'bg-gray-400'   },
}

const FALLBACK_ORDER_STATUS_CONFIG: OrderStatusConfig = {
  label: '',
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  dot: 'bg-gray-400',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STATUSES.map(status => [status, ORDER_STATUS_CONFIG[status].label])
) as Record<OrderStatus, string>

export function getOrderStatusConfig(status: string): OrderStatusConfig {
  const knownStatus = ORDER_STATUSES.find(s => s === status)
  if (!knownStatus) return { ...FALLBACK_ORDER_STATUS_CONFIG, label: status }
  return ORDER_STATUS_CONFIG[knownStatus]
}

export const CARRIER_NAMES = ['intigo', 'navex', 'adex', 'aramex', 'bestdelivery'] as const satisfies readonly CarrierName[]

export const CARRIER_TRACKING_URLS: Record<CarrierName, string> = {
  intigo:        'https://intigo.tn/tracking/',
  navex:         'https://navex-delivery.tn/tracking/',
  adex:          'https://adex.tn/tracking/',
  aramex:        'https://www.aramex.com/track/',
  bestdelivery:  'https://best-delivery.tn/tracking/',
}

export const CARRIER_CONFIG: Record<CarrierName, CarrierConfig> = {
  intigo:        { label: 'IntiGo',        color: 'text-blue-700',   bg: 'bg-blue-50'   },
  navex:         { label: 'Navex',         color: 'text-orange-700', bg: 'bg-orange-50' },
  adex:          { label: 'Adex',          color: 'text-green-700',  bg: 'bg-green-50'  },
  aramex:        { label: 'Aramex',        color: 'text-red-700',    bg: 'bg-red-50'    },
  bestdelivery:  { label: 'Best Delivery', color: 'text-teal-700',   bg: 'bg-teal-50'   },
}

export const CARRIER_OPTIONS: { value: CarrierName; label: string }[] = CARRIER_NAMES.map(name => ({
  value: name,
  label: CARRIER_CONFIG[name].label,
}))

export function getCarrierConfig(carrier: string): CarrierConfig {
  const knownCarrier = CARRIER_NAMES.find(c => c === carrier)
  if (!knownCarrier) return { label: carrier, color: 'text-gray-700', bg: 'bg-gray-50' }
  return CARRIER_CONFIG[knownCarrier]
}

export const HANUT_CONTACT = {
  whatsapp: '+21654727060',
  whatsappUrl: 'https://wa.me/21654727060',
  email: 'hanut.tn@gmail.com',
} as const

export const PLAN_LIMITS = {
  starter: {
    // ⚠️ Synchronisé avec la constante 100 dans supabase/migrations/20260620_secure_order_rpc.sql
    // (ligne : IF v_monthly_orders >= 100). Changer les deux en même temps.
    ordersPerMonth: 100,
    analyticsDays: 30,
    teamMembers: 0,
    stockHistory: false,
    crmTagsNotes: false,
    topStats: false,
    csvExport: false,
  },
  pro: {
    ordersPerMonth: Infinity,
    analyticsDays: 180,
    teamMembers: 3,
    stockHistory: true,
    crmTagsNotes: true,
    topStats: true,
    csvExport: true,
  },
  business: {
    ordersPerMonth: Infinity,
    analyticsDays: 180,
    teamMembers: Infinity,
    stockHistory: true,
    crmTagsNotes: true,
    topStats: true,
    csvExport: true,
  },
} as const

export function getUpgradeWhatsAppUrl(message?: string): string {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const base = whatsapp ? `https://wa.me/${whatsapp}` : HANUT_CONTACT.whatsappUrl
  const text = message ?? 'Bonjour, je souhaite passer au plan Pro (79 DT/mois) pour mon compte Hanut.'
  return `${base}?text=${encodeURIComponent(text)}`
}

export function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const known = CARRIER_NAMES.find(c => c === carrier)
  if (!known || !trackingNumber) return null
  return `${CARRIER_TRACKING_URLS[known]}${trackingNumber}`
}
