import type { OrderStatus } from '@hanut/types'

// 'shipped' est bloqué — commande en cours de livraison ne peut pas être supprimée
export const DELETABLE_STATUSES: OrderStatus[] = ['pending', 'new', 'confirmed', 'delivered', 'returned']

export const ORDER_STATUSES = ['pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  new: 'Nouvelle',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  returned: 'Retournée',
}
