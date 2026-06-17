import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VALID_TRANSITIONS } from '@/lib/order-transitions'
import type { OrderStatus } from '@hanut/types'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const migrationsDir = resolve(repoRoot, 'supabase/migrations')

// Lit toutes les migrations SQL et extrait les transitions insérées dans
// order_status_transitions. ON CONFLICT DO NOTHING est idempotent — on
// accumule simplement sans dédoublonner manuellement.
function extractDbTransitions(): Map<string, Set<string>> {
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  const map = new Map<string, Set<string>>()

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')

    // Chaque bloc INSERT INTO order_status_transitions peut contenir
    // plusieurs paires VALUES. On capture le bloc jusqu'au prochain
    // point-virgule pour éviter les faux positifs.
    const blocks = sql.matchAll(
      /INSERT\s+INTO\s+order_status_transitions[^;]+;/gi
    )

    for (const [block] of blocks) {
      // Extrait les paires ('from_status', 'to_status')
      const pairs = block.matchAll(/'([a-z]+)'\s*,\s*'([a-z]+)'/g)
      for (const [, from, to] of pairs) {
        if (!map.has(from)) map.set(from, new Set())
        map.get(from)!.add(to)
      }
    }
  }

  return map
}

const DB_TRANSITIONS = extractDbTransitions()

const KNOWN_STATUSES: OrderStatus[] = [
  'pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled',
]

describe('order_status_transitions — synchronisation DB (migrations SQL) / TS (VALID_TRANSITIONS)', () => {

  it('tous les statuts connus ont une entrée dans VALID_TRANSITIONS', () => {
    for (const status of KNOWN_STATUSES) {
      expect(
        Object.hasOwn(VALID_TRANSITIONS, status),
        `Statut "${status}" absent de VALID_TRANSITIONS`,
      ).toBe(true)
    }
  })

  it('chaque transition présente en DB existe dans VALID_TRANSITIONS', () => {
    for (const [from, targets] of DB_TRANSITIONS) {
      for (const to of targets) {
        const tsTargets = (VALID_TRANSITIONS[from as OrderStatus] ?? []) as string[]
        expect(
          tsTargets,
          `Transition DB "${from} → ${to}" absente de VALID_TRANSITIONS TS`,
        ).toContain(to)
      }
    }
  })

  it('chaque transition dans VALID_TRANSITIONS existe en DB', () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of targets) {
        const dbTargets = DB_TRANSITIONS.get(from) ?? new Set<string>()
        expect(
          [...dbTargets],
          `Transition TS "${from} → ${to}" absente de la table DB (migrations SQL)`,
        ).toContain(to)
      }
    }
  })

  it('les statuts terminaux delivered et cancelled n\'ont pas de transitions sortantes en DB', () => {
    expect(DB_TRANSITIONS.has('delivered')).toBe(false)
    expect(DB_TRANSITIONS.has('cancelled')).toBe(false)
  })

})
