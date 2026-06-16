import type { CarrierName, HanutContactAddress } from '@hanut/types'
import { normalizeHanutContactAddress } from '@/lib/address'

export type CarrierReadyAddress = {
  recipient_name: string
  recipient_phone: string
  governorate: string
  city: string
  delegation: string
  address: string
  landmark: string
  postal_code: string
  delivery_notes: string
}

export type CarrierAddressCsvRow = {
  Nom: string
  Telephone: string
  Gouvernorat: string
  'Ville / Delegation': string
  Adresse: string
  Repere: string
  'Code postal': string
  Notes: string
}

export function toCarrierReadyAddress(address: HanutContactAddress): CarrierReadyAddress {
  const normalized = normalizeHanutContactAddress(address)
  return {
    recipient_name: normalized.customer_name,
    recipient_phone: normalized.customer_phone,
    governorate: normalized.customer_governorate,
    city: normalized.customer_city,
    delegation: normalized.customer_delegation ?? normalized.customer_city,
    address: normalized.customer_address,
    landmark: normalized.customer_landmark,
    postal_code: normalized.customer_postal_code ?? '',
    delivery_notes: normalized.delivery_notes ?? '',
  }
}

export function toCarrierAddressCsvRow(address: HanutContactAddress): CarrierAddressCsvRow {
  const ready = toCarrierReadyAddress(address)
  return {
    Nom: ready.recipient_name,
    Telephone: ready.recipient_phone,
    Gouvernorat: ready.governorate,
    'Ville / Delegation': ready.delegation || ready.city,
    Adresse: ready.address,
    Repere: ready.landmark,
    'Code postal': ready.postal_code,
    Notes: ready.delivery_notes,
  }
}

export function toManualCarrierPayload(carrier: CarrierName | 'generic', address: HanutContactAddress) {
  const ready = toCarrierReadyAddress(address)

  return {
    carrier,
    recipient: {
      name: ready.recipient_name,
      phone: ready.recipient_phone,
    },
    destination: {
      governorate: ready.governorate,
      city: ready.city,
      delegation: ready.delegation,
      postal_code: ready.postal_code || null,
    },
    address: {
      line1: ready.address,
      landmark: ready.landmark,
      notes: ready.delivery_notes || null,
    },
  }
}
