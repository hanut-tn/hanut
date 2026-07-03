import { describe, expect, it } from 'vitest'
import { isPasswordValid, passwordStrength, PASSWORD_ERROR_MESSAGE } from '../lib/password-policy'

describe('password policy', () => {
  it('rejects a password missing an uppercase letter', () => {
    expect(isPasswordValid('motdepasse1!')).toBe(false)
  })

  it('rejects a password missing a digit', () => {
    expect(isPasswordValid('MotDePasse!')).toBe(false)
  })

  it('rejects a password missing a special character', () => {
    expect(isPasswordValid('MotDePasse1')).toBe(false)
  })

  it('rejects a password under 8 characters', () => {
    expect(isPasswordValid('Md1!')).toBe(false)
  })

  it('accepts a password meeting all criteria', () => {
    expect(isPasswordValid('MotDePasse1!')).toBe(true)
  })

  it('reports strength 0 for an empty password', () => {
    expect(passwordStrength('')).toBe(0)
  })

  it('reports strength 3 only when every criterion passes', () => {
    expect(passwordStrength('MotDePasse1!')).toBe(3)
    expect(passwordStrength('motdepasse1')).toBe(2)
  })

  it('exposes a single canonical error message', () => {
    expect(PASSWORD_ERROR_MESSAGE).toContain('majuscule')
    expect(PASSWORD_ERROR_MESSAGE).toContain('chiffre')
    expect(PASSWORD_ERROR_MESSAGE).toContain('caractère spécial')
  })
})
