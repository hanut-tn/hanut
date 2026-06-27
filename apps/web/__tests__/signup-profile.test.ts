import { describe, expect, it } from 'vitest'
import { isConfirmedHanutSignupUser } from '@/lib/signup-profile'

describe('isConfirmedHanutSignupUser', () => {
  it('accepts confirmed Hanut self-signups', () => {
    expect(isConfirmedHanutSignupUser({
      email_confirmed_at: '2026-06-26T12:00:00.000Z',
      user_metadata: { hanut_signup: true, name: 'Ma Boutique' },
    })).toBe(true)
  })

  it('recovers confirmed legacy signups that only have a shop name', () => {
    expect(isConfirmedHanutSignupUser({
      confirmed_at: '2026-06-26T12:00:00.000Z',
      user_metadata: { name: 'Ancienne Boutique' },
    })).toBe(true)
  })

  it('does not accept unconfirmed users', () => {
    expect(isConfirmedHanutSignupUser({
      user_metadata: { hanut_signup: true, name: 'Ma Boutique' },
    })).toBe(false)
  })

  it('does not accept team invitation users', () => {
    expect(isConfirmedHanutSignupUser({
      email_confirmed_at: '2026-06-26T12:00:00.000Z',
      user_metadata: {
        hanut_signup: true,
        name: 'Invite',
        invitation_token: 'invite-token',
      },
    })).toBe(false)
  })
})
