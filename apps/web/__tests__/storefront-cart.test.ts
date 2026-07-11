import { describe, expect, it } from 'vitest'
import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  addItemToCart,
  buildCartKey,
  cartToOrderItems,
  cartTotals,
  reconcileCartWithProducts,
  type CartItem,
  type StorefrontProduct,
} from '../lib/storefront/cart'

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p1',
    productName: 'T-shirt',
    productImage: null,
    productPrice: 50,
    variantLabel: null,
    quantity: 1,
    maxQty: 10,
    key: buildCartKey('p1', null),
    ...overrides,
  }
}

function makeProduct(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return {
    id: 'p1',
    name: 'T-shirt',
    description: null,
    price: 50,
    stock: 10,
    image_url: null,
    low_stock_alert: 5,
    variants: [],
    hasVariants: false,
    minPrice: 50,
    maxPrice: 50,
    categoryIds: [],
    images_gallery: [],
    ...overrides,
  }
}

describe('buildCartKey', () => {
  it('combines product id and variant label', () => {
    expect(buildCartKey('p1', 'M')).toBe('p1::M')
  })

  it('uses a stable placeholder when there is no variant', () => {
    expect(buildCartKey('p1', null)).toBe('p1::no-variant')
  })
})

describe('cartTotals', () => {
  it('sums quantities and prices across lines', () => {
    const items = [
      makeItem({ quantity: 2, productPrice: 50 }),
      makeItem({ productId: 'p2', key: buildCartKey('p2', null), quantity: 1, productPrice: 30 }),
    ]
    expect(cartTotals(items)).toEqual({ totalItems: 3, totalPrice: 130 })
  })

  it('returns zero totals for an empty cart', () => {
    expect(cartTotals([])).toEqual({ totalItems: 0, totalPrice: 0 })
  })
})

describe('cartToOrderItems', () => {
  it('never emits unit_price — the server always recomputes it', () => {
    const items = [makeItem({ variantLabel: 'M', quantity: 3 })]
    const payload = cartToOrderItems(items)
    expect(payload).toEqual([{ product_id: 'p1', variant: 'M', quantity: 3 }])
    expect(payload[0]).not.toHaveProperty('unit_price')
    expect(payload[0]).not.toHaveProperty('productPrice')
  })

  it('omits variant when there is none (undefined, not null)', () => {
    const payload = cartToOrderItems([makeItem({ variantLabel: null })])
    expect(payload[0].variant).toBeUndefined()
  })
})

describe('addItemToCart', () => {
  it('adds a new line', () => {
    const result = addItemToCart([], makeItem({ quantity: 2 }))
    expect(result.error).toBeUndefined()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(2)
  })

  it('merges the same product/variant instead of creating a duplicate line', () => {
    const existing = [makeItem({ quantity: 2, maxQty: 10 })]
    const result = addItemToCart(existing, makeItem({ quantity: 3, maxQty: 10 }))
    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(5)
  })

  it('treats a different variant of the same product as a separate line', () => {
    const existing = [makeItem({ variantLabel: 'M', key: buildCartKey('p1', 'M') })]
    const result = addItemToCart(existing, makeItem({ variantLabel: 'L', key: buildCartKey('p1', 'L') }))
    expect(result.items).toHaveLength(2)
  })

  it('caps the merged quantity at maxQty and reports clamped', () => {
    const existing = [makeItem({ quantity: 8, maxQty: 10 })]
    const result = addItemToCart(existing, makeItem({ quantity: 5, maxQty: 10 }))
    expect(result.items[0].quantity).toBe(10)
    expect(result.clamped).toBe(true)
  })

  it('caps at MAX_LINE_QTY even if maxQty (stock) is higher', () => {
    const result = addItemToCart([], makeItem({ quantity: 150, maxQty: 500 }))
    expect(result.items[0].quantity).toBe(MAX_LINE_QTY)
  })

  it('refuses to add more when the line is already at cap', () => {
    const existing = [makeItem({ quantity: 10, maxQty: 10 })]
    const result = addItemToCart(existing, makeItem({ quantity: 1, maxQty: 10 }))
    expect(result.error).toBe('max_stock')
    expect(result.items).toBe(existing)
  })

  it('refuses a new line beyond MAX_CART_LINES', () => {
    const existing = Array.from({ length: MAX_CART_LINES }, (_, i) =>
      makeItem({ productId: `p${i}`, key: buildCartKey(`p${i}`, null) }))
    const result = addItemToCart(existing, makeItem({ productId: 'new', key: buildCartKey('new', null) }))
    expect(result.error).toBe('cart_full')
    expect(result.items).toHaveLength(MAX_CART_LINES)
  })
})

describe('reconcileCartWithProducts — purge/rebornage après un 409 stock', () => {
  it('drops a line whose product no longer exists', () => {
    const cart = [makeItem({ productId: 'gone', key: buildCartKey('gone', null) })]
    expect(reconcileCartWithProducts(cart, [])).toEqual([])
  })

  it('drops a line whose stock just fell to zero', () => {
    const cart = [makeItem({ quantity: 2, maxQty: 3 })]
    const products = [makeProduct({ stock: 0 })]
    expect(reconcileCartWithProducts(cart, products)).toEqual([])
  })

  it('clamps quantity and maxQty when stock decreased without reaching zero (the actual bug)', () => {
    // Avant le fix : un simple filter() gardait quantity=2 alors que le stock
    // frais n'est plus que de 1, provoquant un nouveau 409 en boucle.
    const cart = [makeItem({ quantity: 2, maxQty: 3 })]
    const products = [makeProduct({ stock: 1 })]
    const result = reconcileCartWithProducts(cart, products)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(1)
    expect(result[0].maxQty).toBe(1)
  })

  it('leaves an unaffected line untouched', () => {
    const cart = [makeItem({ quantity: 2, maxQty: 10 })]
    const products = [makeProduct({ stock: 10 })]
    expect(reconcileCartWithProducts(cart, products)).toEqual(cart)
  })

  it('resolves stock via the matching variant, not the base product', () => {
    const cart = [makeItem({
      variantLabel: 'M',
      key: buildCartKey('p1', 'M'),
      quantity: 4,
      maxQty: 5,
    })]
    const products = [makeProduct({
      hasVariants: true,
      variants: [{ label: 'M', qty: 2 }, { label: 'L', qty: 8 }],
    })]
    const result = reconcileCartWithProducts(cart, products)
    expect(result[0].quantity).toBe(2)
    expect(result[0].maxQty).toBe(2)
  })

  it('drops a variant line if that specific variant disappeared from the product', () => {
    const cart = [makeItem({ variantLabel: 'M', key: buildCartKey('p1', 'M') })]
    const products = [makeProduct({ hasVariants: true, variants: [{ label: 'L', qty: 5 }] })]
    expect(reconcileCartWithProducts(cart, products)).toEqual([])
  })
})
