// Types et logique du panier de la mini boutique publique (/s/[slug]).
// Le panier vit uniquement côté client ; les prix qu'il contient servent à
// l'affichage. Le prix facturé est recalculé côté serveur par
// create_order_with_items (prix variante > prix produit) — verify-otp
// n'accepte pas de unit_price client.

export interface StorefrontVariant {
  size?: string
  color?: string
  qty: number
  price?: number | null
  /** Libellé calculé via getVariantLabel côté serveur. */
  label: string
}

export interface StorefrontProduct {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  low_stock_alert: number
  variants: StorefrontVariant[]
  hasVariants: boolean
  /** Prix effectif minimum (variantes en stock incluses). */
  minPrice: number
  /** Prix effectif maximum — si > minPrice, afficher « À partir de ». */
  maxPrice: number
}

export interface CartItem {
  productId: string
  productName: string
  productImage: string | null
  /** Prix effectif affiché (variante ou produit). */
  productPrice: number
  variantLabel: string | null
  quantity: number
  /** Stock disponible pour cette variante (ou le produit). */
  maxQty: number
  key: string
}

/** Limites alignées sur le schéma Zod de verify-otp. */
export const MAX_CART_LINES = 20
export const MAX_LINE_QTY = 99

export function buildCartKey(productId: string, variantLabel: string | null): string {
  return `${productId}::${variantLabel ?? 'no-variant'}`
}

export function cartTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.productPrice * i.quantity, 0),
  }
}

/** Payload items[] pour verify-otp : product_id / variant / quantity uniquement. */
export function cartToOrderItems(items: CartItem[]) {
  return items.map(item => ({
    product_id: item.productId,
    variant: item.variantLabel ?? undefined,
    quantity: item.quantity,
  }))
}

export type AddToCartResult = {
  items: CartItem[]
  error?: 'cart_full' | 'max_stock'
  clamped?: boolean
}

/**
 * Ajoute (ou fusionne) une ligne. La quantité est bornée par le stock de la
 * variante et par la limite Zod de 99 ; le panier est limité à 20 lignes.
 */
export function addItemToCart(items: CartItem[], newItem: Omit<CartItem, 'key'>): AddToCartResult {
  const key = buildCartKey(newItem.productId, newItem.variantLabel)
  const cap = Math.min(newItem.maxQty, MAX_LINE_QTY)
  const existing = items.find(i => i.key === key)

  if (existing) {
    if (existing.quantity >= cap) return { items, error: 'max_stock' }
    const nextQty = Math.min(existing.quantity + newItem.quantity, cap)
    return {
      items: items.map(i => (i.key === key ? { ...i, quantity: nextQty, maxQty: newItem.maxQty } : i)),
      clamped: nextQty < existing.quantity + newItem.quantity,
    }
  }

  if (items.length >= MAX_CART_LINES) return { items, error: 'cart_full' }
  return {
    items: [...items, { ...newItem, key, quantity: Math.min(newItem.quantity, cap) }],
  }
}
