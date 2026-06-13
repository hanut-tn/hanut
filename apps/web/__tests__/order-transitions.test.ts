import { describe, expect, it } from 'vitest'
import {
  getAvailableTransitions,
  isValidTransition,
  VALID_TRANSITIONS,
} from '@/lib/order-transitions'

describe('order transition state machine', () => {
  it('matches the nine transitions stored in the database migration', () => {
    const count = Object.values(VALID_TRANSITIONS)
      .reduce((total, transitions) => total + transitions.length, 0)

    expect(count).toBe(9)
  })

  it('accepts valid transitions and rejects invalid or unknown statuses', () => {
    expect(isValidTransition('pending', 'new')).toBe(true)
    expect(isValidTransition('shipped', 'confirmed')).toBe(true)
    expect(isValidTransition('pending', 'delivered')).toBe(false)
    expect(isValidTransition('unknown', 'new')).toBe(false)
  })

  it('hides system-only and forbidden transitions from operators', () => {
    expect(getAvailableTransitions('shipped', 'admin')).toEqual(['delivered', 'returned'])
    expect(getAvailableTransitions('confirmed', 'operator')).toEqual(['shipped'])
    expect(getAvailableTransitions('confirmed', 'readonly')).toEqual([])
  })
})
