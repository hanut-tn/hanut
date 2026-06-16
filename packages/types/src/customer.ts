export interface Customer {
  id: string
  seller_id: string
  name: string
  phone: string
  email?: string | null
  customer_governorate?: string | null
  customer_city?: string | null
  customer_delegation?: string | null
  customer_address?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address_version?: number
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
  customer_governorate?: string
  customer_city?: string
  customer_delegation?: string
  customer_address?: string
  customer_landmark?: string
  customer_postal_code?: string
  delivery_notes?: string
  address?: string
  city?: string
}

export interface CustomerAddress {
  id: string
  seller_id: string
  customer_id: string
  customer_governorate?: string | null
  customer_city?: string | null
  customer_delegation?: string | null
  customer_address?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address_version?: number
  address?: string | null
  city?: string | null
  use_count: number
  first_used_at: string
  last_used_at: string
}
