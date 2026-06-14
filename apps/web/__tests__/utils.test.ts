import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from '@/lib/utils'

describe('escapeLikePattern', () => {
  it('escapes PostgreSQL LIKE wildcards', () => {
    expect(escapeLikePattern('50%_promo')).toBe('50\\%\\_promo')
  })

  it('escapes backslashes before wildcard characters', () => {
    expect(escapeLikePattern(String.raw`a\b%c_d`)).toBe(String.raw`a\\b\%c\_d`)
  })

  it('leaves ordinary search text unchanged', () => {
    expect(escapeLikePattern('rania 123')).toBe('rania 123')
  })
})
