import type { CarrierName, OrderStatus } from '@hanut/types'

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

// 'shipped' est bloqué — commande en cours de livraison ne peut pas être supprimée
export const DELETABLE_STATUSES: OrderStatus[] = ['pending', 'new', 'confirmed', 'delivered', 'returned']

export const ORDER_STATUSES = ['pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'] as const satisfies readonly OrderStatus[]

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending:   { label: 'En attente', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  new:       { label: 'Nouvelle',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  confirmed: { label: 'Confirmée',  bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500'    },
  shipped:   { label: 'Expédiée',   bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  delivered: { label: 'Livrée',     bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  returned:  { label: 'Retournée',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
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
  bestdelivery:  { label: 'Best Delivery', color: 'text-purple-700', bg: 'bg-purple-50' },
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
