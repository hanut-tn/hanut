import { describe, expect, it } from 'vitest'
import { buildActiveCustomerAddresses } from '@/lib/customer-addresses'

describe('buildActiveCustomerAddresses', () => {
  it('counts only active order snapshots and hides addresses with no active order', () => {
    const addresses = [
      {
        id: 'address-a',
        address: 'Rue A',
        city: 'Tunis',
        customer_governorate: 'Tunis',
        customer_city: 'Tunis Ville',
        customer_address: 'Rue A',
        customer_landmark: 'Près de la poste',
        first_used_at: '2026-06-01T00:00:00.000Z',
        last_used_at: '2026-06-10T00:00:00.000Z',
      },
      {
        id: 'address-deleted-only',
        address: 'Rue supprimée',
        city: 'Béja',
        first_used_at: '2026-06-01T00:00:00.000Z',
        last_used_at: '2026-06-10T00:00:00.000Z',
      },
    ]

    const activeOrders = [
      {
        customer_address: 'Rue A',
        customer_city: 'Tunis Ville',
        customer_governorate: 'Tunis',
        customer_landmark: 'Près de la poste',
        created_at: '2026-06-10T00:00:00.000Z',
      },
      {
        customer_address: ' rue a ',
        customer_city: 'TUNIS VILLE',
        customer_governorate: 'TUNIS',
        customer_landmark: 'près de la poste',
        created_at: '2026-06-15T00:00:00.000Z',
      },
    ]

    expect(buildActiveCustomerAddresses(addresses, activeOrders)).toEqual([
      {
        id: 'address-a',
        address: 'rue a',
        city: 'TUNIS',
        customer_governorate: 'TUNIS',
        customer_city: 'TUNIS VILLE',
        customer_delegation: null,
        customer_address: 'rue a',
        customer_landmark: 'près de la poste',
        customer_postal_code: null,
        delivery_notes: null,
        address_version: 2,
        use_count: 2,
        first_used_at: '2026-06-10T00:00:00.000Z',
        last_used_at: '2026-06-15T00:00:00.000Z',
      },
    ])
  })

  it('creates a temporary stable id when the stored address row is missing', () => {
    expect(buildActiveCustomerAddresses([], [
      {
        customer_address: 'Nouvelle rue',
        customer_city: 'Sousse Médina',
        customer_governorate: 'Sousse',
        customer_landmark: 'Face pharmacie',
        created_at: '2026-06-16T00:00:00.000Z',
      },
    ])).toEqual([
      {
        id: 'active-address-0',
        address: 'Nouvelle rue',
        city: 'Sousse',
        customer_governorate: 'Sousse',
        customer_city: 'Sousse Médina',
        customer_delegation: null,
        customer_address: 'Nouvelle rue',
        customer_landmark: 'Face pharmacie',
        customer_postal_code: null,
        delivery_notes: null,
        address_version: 2,
        use_count: 1,
        first_used_at: '2026-06-16T00:00:00.000Z',
        last_used_at: '2026-06-16T00:00:00.000Z',
      },
    ])
  })
})
