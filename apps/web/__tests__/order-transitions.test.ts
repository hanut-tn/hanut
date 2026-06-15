import { describe, expect, it } from 'vitest'
import {
  getAvailableTransitions,
  isValidTransition,
  VALID_TRANSITIONS,
} from '@/lib/order-transitions'

describe('order transition state machine', () => {
  it('matches the ten transitions stored in the database migrations', () => {
    const count = Object.values(VALID_TRANSITIONS)
      .reduce((total, transitions) => total + transitions.length, 0)

    expect(count).toBe(10)
  })

  it('accepts valid transitions and rejects invalid or unknown statuses', () => {
    expect(isValidTransition('pending', 'new')).toBe(true)
    expect(isValidTransition('shipped', 'confirmed')).toBe(true)
    expect(isValidTransition('returned', 'cancelled')).toBe(true)
    expect(isValidTransition('pending', 'delivered')).toBe(false)
    expect(isValidTransition('unknown', 'new')).toBe(false)
  })

  it('hides system-only and forbidden transitions from operators', () => {
    expect(getAvailableTransitions('shipped', 'admin')).toEqual(['delivered', 'returned'])
    expect(getAvailableTransitions('confirmed', 'operator')).toEqual(['shipped'])
    expect(getAvailableTransitions('returned', 'admin')).toEqual(['cancelled'])
    expect(getAvailableTransitions('returned', 'operator')).toEqual([])
    expect(getAvailableTransitions('confirmed', 'readonly')).toEqual([])
  })
})
