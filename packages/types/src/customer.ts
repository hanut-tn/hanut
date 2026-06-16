export interface Customer {
  id: string
  seller_id: string
  name: string
  phone: string
  email?: string | null
  address?: string
  city?: string
  order_count: number
  created_at: string
  tags?: string[]
  notes?: string
  total_spent?: number | null
  last_order_at?: string | null
  delivered_count?: number
  returned_count?: number
  cancelled_count?: number
  delivery_rate?: number
  addresses?: CustomerAddress[]
}

export interface CreateCustomerInput {
  name: string
  phone: string
  address?: string
  city?: string
}

export interface CustomerAddress {
  id: string
  seller_id: string
  customer_id: string
  address?: string | null
  city?: string | null
  use_count: number
  first_used_at: string
  last_used_at: string
}
