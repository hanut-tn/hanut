export type VariantLike = {
  size?: string | null
  color?: string | null
  name?: string | null
  qty: number
  price?: number | null
}

export function getVariantLabel(variant: VariantLike, index: number): string {
  const parts = [variant.size, variant.color]
    .map(part => part?.trim())
    .filter(Boolean)

  if (parts.length > 0) return parts.join(' / ')

  const name = variant.name?.trim()
  if (name) return name

  return `Variante ${index + 1}`
}

/**
 * Prix effectif d'une variante : son price s'il est défini (et >= 0),
 * sinon le prix du produit. Miroir de la résolution faite côté DB
 * dans create_order_with_items (migration variant_prices).
 */
export function getVariantPrice(
  variants: VariantLike[],
  variantLabel: string | null,
  fallbackPrice: number
): number {
  if (!variantLabel || variants.length === 0) return fallbackPrice
  const index = variants.findIndex((v, i) => getVariantLabel(v, i) === variantLabel)
  if (index === -1) return fallbackPrice
  const price = variants[index].price
  return price != null && price >= 0 ? price : fallbackPrice
}

export function sumVariantStock(variants: VariantLike[]): number {
  return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.qty) || 0), 0)
}

export function hasVariantStock(variants: VariantLike[]): boolean {
  return variants.some(variant => Math.max(0, Number(variant.qty) || 0) > 0)
}
