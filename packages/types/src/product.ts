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
  cost?: number
  stock: number
  low_stock_alert: number
  variants: ProductVariant[]
  image_url?: string
  description?: string
  created_at: string
}

export interface CreateProductInput {
  name: string
  price: number
  cost?: number
  stock: number
  low_stock_alert?: number
  variants?: ProductVariant[]
  image_url?: string
}
