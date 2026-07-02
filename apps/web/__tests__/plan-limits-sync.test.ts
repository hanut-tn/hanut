import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLAN_LIMITS } from '@/lib/constants'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const secureOrderRpc = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260620000000_secure_order_rpc.sql'),
  'utf8',
)

describe('PLAN_LIMITS cohérence avec les migrations SQL', () => {

  it('ordersPerMonth Starter correspond à la limite appliquée dans la RPC SQL', () => {
    const sqlLimit = secureOrderRpc.match(/IF\s+v_monthly_orders\s*>=\s*(\d+)\s+THEN/i)
    expect(sqlLimit).not.toBeNull()
    expect(PLAN_LIMITS.starter.ordersPerMonth).toBe(Number(sqlLimit?.[1]))
  })

  it('Pro n\'a pas de limite de commandes', () => {
    expect(PLAN_LIMITS.pro.ordersPerMonth).toBe(Infinity)
  })

  it('teamMembers Starter est 0', () => {
    expect(PLAN_LIMITS.starter.teamMembers).toBe(0)
  })

  it('teamMembers Pro est 3', () => {
    expect(PLAN_LIMITS.pro.teamMembers).toBe(3)
  })

  it('analyticsDays Starter est 30', () => {
    expect(PLAN_LIMITS.starter.analyticsDays).toBe(30)
  })

  it('analyticsDays Pro est 180', () => {
    expect(PLAN_LIMITS.pro.analyticsDays).toBe(180)
  })

})
