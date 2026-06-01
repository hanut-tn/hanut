export interface Customer {
  id: string
  seller_id: string
  name: string
  phone: string
  address?: string
  city?: string
  order_count: number
  created_at: string
  tags?: string[]
  notes?: string
}

export interface CreateCustomerInput {
  name: string
  phone: string
  address?: string
  city?: string
}
