import { z } from 'zod'
import type { HanutAddress, HanutContactAddress } from '@hanut/types'
import {
  TUNISIAN_GOVERNORATES,
  formatTunisianPhone,
  isValidTunisianPhone,
} from '@/lib/constants'

function optionalTrimmedString(max: number) {
  return z.preprocess(
    value => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed ? trimmed : undefined
    },
    z.string().trim().max(max).optional(),
  )
}

const requiredText = (min: number, max: number, label: string) =>
  z.string()
    .trim()
    .min(min, `${label} est obligatoire.`)
    .max(max, `${label} est trop long.`)

export const HanutAddressFieldsSchema = z.object({
  customer_governorate: requiredText(1, 100, 'Le gouvernorat')
    .refine(
      value => (TUNISIAN_GOVERNORATES as readonly string[]).includes(value),
      'Gouvernorat invalide.',
    ),
  customer_city: requiredText(1, 100, 'La ville / délégation'),
  customer_delegation: optionalTrimmedString(100),
  customer_address: requiredText(2, 250, "L'adresse détaillée"),
  customer_landmark: requiredText(2, 200, 'Le repère livreur'),
  customer_postal_code: z.preprocess(
    value => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed ? trimmed : undefined
    },
    z.string()
      .trim()
      .regex(/^\d{4}$/, 'Le code postal doit contenir 4 chiffres.')
      .optional(),
  ),
  delivery_notes: optionalTrimmedString(500),
})

export const HanutContactAddressSchema = HanutAddressFieldsSchema.extend({
  customer_name: requiredText(2, 100, 'Le nom complet'),
  customer_phone: z.string()
    .transform(formatTunisianPhone)
    .refine(isValidTunisianPhone, 'Numéro tunisien invalide. Ex: 22 123 456'),
})

export type HanutAddressFieldsInput = z.input<typeof HanutAddressFieldsSchema>
export type HanutAddressFields = z.output<typeof HanutAddressFieldsSchema>
export type HanutContactAddressInput = z.input<typeof HanutContactAddressSchema>

export function cleanAddressPart(value?: string | null): string | null {
  const cleaned = value?.trim().replace(/\s+/g, ' ')
  return cleaned ? cleaned : null
}

function normalizePostalCode(value?: string | null): string | null {
  const cleaned = value?.replace(/\D/g, '').slice(0, 4)
  return cleaned ? cleaned : null
}

export function normalizeHanutAddress(address: HanutAddress): HanutAddress {
  return {
    customer_governorate: cleanAddressPart(address.customer_governorate) ?? '',
    customer_city: cleanAddressPart(address.customer_city) ?? '',
    customer_delegation: cleanAddressPart(address.customer_delegation),
    customer_address: cleanAddressPart(address.customer_address) ?? '',
    customer_landmark: cleanAddressPart(address.customer_landmark) ?? '',
    customer_postal_code: normalizePostalCode(address.customer_postal_code),
    delivery_notes: cleanAddressPart(address.delivery_notes),
  }
}

export function normalizeHanutContactAddress(address: HanutContactAddress): HanutContactAddress {
  return {
    ...normalizeHanutAddress(address),
    customer_name: cleanAddressPart(address.customer_name) ?? '',
    customer_phone: formatTunisianPhone(address.customer_phone),
  }
}

export function formatHanutAddressLines(address: HanutAddress): string[] {
  const normalized = normalizeHanutAddress(address)
  return [
    normalized.customer_address,
    normalized.customer_landmark ? `Repere: ${normalized.customer_landmark}` : '',
    normalized.customer_delegation,
    normalized.customer_city,
    normalized.customer_governorate,
    normalized.customer_postal_code,
    normalized.delivery_notes ? `Notes: ${normalized.delivery_notes}` : '',
  ].filter(Boolean) as string[]
}

export function structuredAddressFromLegacy(input: {
  customer_governorate?: string | null
  customer_city?: string | null
  customer_delegation?: string | null
  customer_address?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address?: string | null
  city?: string | null
}): Partial<HanutAddress> {
  return {
    customer_governorate: cleanAddressPart(input.customer_governorate) ?? cleanAddressPart(input.city) ?? undefined,
    customer_city: cleanAddressPart(input.customer_city) ?? undefined,
    customer_delegation: cleanAddressPart(input.customer_delegation) ?? undefined,
    customer_address: cleanAddressPart(input.customer_address) ?? cleanAddressPart(input.address) ?? undefined,
    customer_landmark: cleanAddressPart(input.customer_landmark) ?? undefined,
    customer_postal_code: cleanAddressPart(input.customer_postal_code) ?? undefined,
    delivery_notes: cleanAddressPart(input.delivery_notes) ?? undefined,
  }
}
