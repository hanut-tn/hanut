import { describe, expect, it } from 'vitest'
import { POST } from '../app/api/orders/public/route'

describe('POST /api/orders/public', () => {
  it('rejects the legacy direct-order flow and requires email OTP', async () => {
    const response = await POST()

    expect(response.status).toBe(410)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'La vérification par email est obligatoire. Rechargez le formulaire.',
      code: 'OTP_REQUIRED',
    })
  })
})
