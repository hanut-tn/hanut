export type VariantLike = {
  size?: string | null
  color?: string | null
  name?: string | null
  qty: number
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

export function sumVariantStock(variants: VariantLike[]): number {
  return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.qty) || 0), 0)
}

export function hasVariantStock(variants: VariantLike[]): boolean {
  return variants.some(variant => Math.max(0, Number(variant.qty) || 0) > 0)
}
