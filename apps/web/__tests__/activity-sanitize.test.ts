import { describe, expect, it } from 'vitest'
import { sanitizeDescription } from '@/lib/activity'

describe('sanitizeDescription', () => {
  it.each([
    '22222222',
    '+21622222222',
    '00216 22 222 222',
    '55-555-555',
  ])('redacts Tunisian phone number %s', (phone) => {
    expect(sanitizeDescription(`Client ${phone} créé`)).toBe(
      'Client [TÉLÉPHONE] créé'
    )
  })

  it('does not redact ordinary amounts or longer identifiers', () => {
    expect(sanitizeDescription('Commande 79 DT, référence 123456789')).toBe(
      'Commande 79 DT, référence 123456789'
    )
  })
})
