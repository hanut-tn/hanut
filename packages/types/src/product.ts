export interface ProductVariant {
  size?: string
  color?: string
  qty: number
  /** Prix optionnel — si absent, products.price est utilisé. */
  price?: number | null
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
  images_gallery: string[]
  description?: string | null
  created_at: string
}

export interface Category {
  id: string
  seller_id: string
  name: string
  position: number
  created_at: string
}

export interface ProductWithCategories extends Product {
  categories: Category[]
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
