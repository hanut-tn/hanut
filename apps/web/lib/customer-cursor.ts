export const CUSTOMER_SORTS = ['name', 'total_spent', 'order_count', 'last_order'] as const

export type CustomerSortBy = (typeof CUSTOMER_SORTS)[number]

export type CustomerCursorPayload = {
  v: string | null
  id: string
  s: CustomerSortBy
}

type CursorCustomer = {
  id: string
  name: string
  order_count?: number | null
  total_spent_calc?: number | null
  last_order_at?: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCustomerSort(value: string | null): value is CustomerSortBy {
  return CUSTOMER_SORTS.includes(value as CustomerSortBy)
}

export function getCustomerCursorValue(
  customer: CursorCustomer,
  sortBy: CustomerSortBy,
): string | null {
  switch (sortBy) {
    case 'order_count':
      return customer.order_count != null ? String(customer.order_count) : null
    case 'total_spent':
      return customer.total_spent_calc != null ? String(customer.total_spent_calc) : null
    case 'last_order':
      return customer.last_order_at ?? null
    default:
      return customer.name
  }
}

export function encodeCustomerCursor(payload: CustomerCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCustomerCursor(raw: string): CustomerCursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return null

    const cursor = parsed as Partial<CustomerCursorPayload>
    if (
      (cursor.v !== null && typeof cursor.v !== 'string')
      || typeof cursor.id !== 'string'
      || !UUID_PATTERN.test(cursor.id)
      || !isCustomerSort(cursor.s ?? null)
    ) {
      return null
    }

    return cursor as CustomerCursorPayload
  } catch {
    return null
  }
}
