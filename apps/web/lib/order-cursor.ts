const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type OrderCursorPayload = {
  createdAt: string
  id: string
}

export function parseIsoDate(value: string | null, field: string): string | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`${field} invalide.`)
  return new Date(timestamp).toISOString()
}

export function encodeOrderCursor(row: OrderCursorPayload): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt, id: row.id }))
    .toString('base64url')
}

export function decodeOrderCursor(value: string): OrderCursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<OrderCursorPayload>
    const createdAt = parseIsoDate(typeof parsed.createdAt === 'string' ? parsed.createdAt : null, 'cursor')
    if (!createdAt || typeof parsed.id !== 'string' || !UUID_PATTERN.test(parsed.id)) return null
    return { createdAt, id: parsed.id }
  } catch {
    return null
  }
}
