export interface ProductVariant {
  size?: string
  color?: string
  qty: number
}

export interface Product {
  id: string
  seller_id: string
  name: string
  price: number
  cost?: number | null
  stock: number
  low_stock_alert: number
  variants: ProductVariant[]
  image_url?: string | null
  description?: string | null
  created_at: string
}

export interface CreateProductInput {
  name: string
  price: number
  cost?: number | null
  stock: number
  low_stock_alert?: number
  variants?: ProductVariant[]
  image_url?: string | null
  description?: string | null
}
