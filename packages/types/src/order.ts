export type OrderStatus = 'pending' | 'new' | 'confirmed' | 'shipped' | 'delivered' | 'returned'

export interface Order {
  id: string
  seller_id: string
  customer_id: string
  product_id: string
  variant?: string
  quantity: number
  cod_amount: number
  status: OrderStatus
  notes?: string
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
  customer_address?: string
  customer_city?: string
  product_id: string
  variant?: string
  quantity: number
  cod_amount: number
  notes?: string
}

import type { Customer } from './customer'
import type { Product } from './product'
import type { Delivery } from './delivery'
