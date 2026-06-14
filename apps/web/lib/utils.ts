/**
 * Retourne une date relative en français
 * Ex: "il y a 2h", "hier", "12 mai"
 */
export function relativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  if (hours < 24) return `il y a ${hours}h`
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days}j`
  return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })
}

/**
 * Retourne les initiales d'un nom ou email
 * Ex: "Ahmed Durmus" → "AD", "yusuf@mail.com" → "Y"
 */
export function initials(name: string): string {
  if (!name) return '?'
  const input = name.includes('@') ? name.split('@')[0] : name
  return (
    input
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => (word[0] ?? '').toUpperCase())
      .join('') || '?'
  )
}

/**
 * Formate un montant en dinars tunisiens
 * Ex: 31.5 → "31,50 DT", null → "—"
 */
export function formatDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `${amount.toFixed(2).replace('.', ',')} DT`
}

/** Escapes `%` and `_` wildcard characters before use in an `.ilike()` pattern. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Formate une date complète en français tunisien
 * Ex: "04 juin 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
