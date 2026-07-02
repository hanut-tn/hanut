import type { OrderStatus } from '@hanut/types'

// Valid order status transitions. Must stay in sync with the
// order_status_transitions table (migration 20260622000000_add_status_transitions.sql).
// delivered and cancelled are terminal. returned can be finalized as cancelled
// through cancel_order_with_stock, which also restores stock atomically.
// shipped → confirmed is a system-only rollback used when a delivery is deleted;
// it is intentionally excluded from getAvailableTransitions (not a user action).
export const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending:   ['new', 'cancelled'],
  new:       ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'returned', 'confirmed'],
  delivered: [],
  returned:  ['cancelled'],
  cancelled: [],
}

export function isValidTransition(fromStatus: string, toStatus: OrderStatus): boolean {
  return Object.hasOwn(VALID_TRANSITIONS, fromStatus)
    && VALID_TRANSITIONS[fromStatus as OrderStatus].includes(toStatus)
}

export function getAvailableTransitions(
  currentStatus: OrderStatus,
  role: 'admin' | 'operator' | 'readonly'
): OrderStatus[] {
  if (role === 'readonly') return []

  const base = VALID_TRANSITIONS[currentStatus]
  // Exclude the delivery-deletion rollback from user-facing actions.
  const userFacing = base.filter(s => !(currentStatus === 'shipped' && s === 'confirmed'))

  if (role === 'operator') {
    return userFacing.filter(s => s !== 'cancelled')
  }

  return userFacing
}
