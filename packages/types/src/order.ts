import type { Customer } from './customer'
import type { Product } from './product'
import type { Delivery } from './delivery'

export type OrderStatus = 'pending' | 'new' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

export interface Order {
  id: string
  seller_id: string
  customer_id: string
  product_id: string
  variant?: string | null
  quantity: number
  cod_amount: number
  unit_cost: number
  status: OrderStatus
  notes?: string | null
  customer_email?: string | null
  customer_governorate?: string | null
  customer_delegation?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address_version?: number
  customer_address?: string | null
  customer_city?: string | null
  tracking_token?: string | null
  deleted_at?: string | null
  archived_by?: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
  delivery?: Delivery
}

export interface CreateOrderInput {
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  customer_governorate?: string
  customer_delegation?: string
  customer_landmark?: string
  customer_postal_code?: string
  delivery_notes?: string
  customer_address?: string
  customer_city?: string
  customer_email?: string
  product_id: string
  variant?: string
  quantity: number
  cod_amount: number
  notes?: string
}
