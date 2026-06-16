export type StoredCustomerAddress = {
  id: string
  address?: string | null
  city?: string | null
  customer_governorate?: string | null
  customer_city?: string | null
  customer_delegation?: string | null
  customer_address?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address_version?: number | null
  first_used_at: string
  last_used_at: string
}

export type OrderAddressSnapshot = {
  address?: string | null
  city?: string | null
  customer_address?: string | null
  customer_city?: string | null
  customer_governorate?: string | null
  customer_delegation?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address_version?: number | null
  created_at: string
}

export type ActiveCustomerAddress = {
  id: string
  address: string | null
  city: string | null
  customer_governorate: string | null
  customer_city: string | null
  customer_delegation: string | null
  customer_address: string | null
  customer_landmark: string | null
  customer_postal_code: string | null
  delivery_notes: string | null
  address_version: number
  use_count: number
  first_used_at: string
  last_used_at: string
}

function clean(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalize(value?: string | null): string {
  return clean(value)?.toLowerCase().replace(/\s+/g, ' ') ?? ''
}

function addressValues(input: StoredCustomerAddress | OrderAddressSnapshot) {
  const governorate = clean(input.customer_governorate)
  const city = clean(input.customer_city)
  const delegation = clean(input.customer_delegation)
  const address = clean(input.customer_address)
  const landmark = clean(input.customer_landmark)
  const postalCode = clean(input.customer_postal_code)
  const hasStructured =
    Boolean(governorate || city || delegation || address || landmark || postalCode || clean(input.delivery_notes))

  return {
    address: address ?? clean(input.address),
    city: governorate ?? clean(input.city),
    customer_governorate: governorate ?? clean(input.city),
    customer_city: city,
    customer_delegation: delegation,
    customer_address: address ?? clean(input.address),
    customer_landmark: landmark,
    customer_postal_code: postalCode,
    delivery_notes: clean(input.delivery_notes),
    address_version: input.address_version ?? (hasStructured ? 2 : 1),
    hasStructured,
  }
}

function addressKey(input: StoredCustomerAddress | OrderAddressSnapshot): string {
  const values = addressValues(input)
  if (values.hasStructured) {
    return [
      values.customer_governorate,
      values.customer_city,
      values.customer_delegation,
      values.customer_address,
      values.customer_landmark,
      values.customer_postal_code,
    ].map(normalize).join('::')
  }
  return `${normalize(values.address)}::${normalize(values.city)}`
}

export function buildActiveCustomerAddresses(
  storedAddresses: StoredCustomerAddress[],
  activeOrders: OrderAddressSnapshot[],
): ActiveCustomerAddress[] {
  const storedIdByKey = new Map(
    storedAddresses.map(address => [addressKey(address), address.id]),
  )

  const usageByKey = new Map<string, ActiveCustomerAddress>()

  for (const order of activeOrders) {
    const values = addressValues(order)
    if (!values.customer_address && !values.customer_city && !values.customer_governorate) continue

    const key = addressKey(order)
    const existing = usageByKey.get(key)

    if (!existing) {
      usageByKey.set(key, {
        id: storedIdByKey.get(key) ?? `active-address-${usageByKey.size}`,
        address: values.address,
        city: values.city,
        customer_governorate: values.customer_governorate,
        customer_city: values.customer_city,
        customer_delegation: values.customer_delegation,
        customer_address: values.customer_address,
        customer_landmark: values.customer_landmark,
        customer_postal_code: values.customer_postal_code,
        delivery_notes: values.delivery_notes,
        address_version: values.address_version,
        use_count: 1,
        first_used_at: order.created_at,
        last_used_at: order.created_at,
      })
      continue
    }

    existing.use_count += 1

    if (new Date(order.created_at) < new Date(existing.first_used_at)) {
      existing.first_used_at = order.created_at
    }

    if (new Date(order.created_at) > new Date(existing.last_used_at)) {
      existing.last_used_at = order.created_at
      existing.address = values.address
      existing.city = values.city
      existing.customer_governorate = values.customer_governorate
      existing.customer_city = values.customer_city
      existing.customer_delegation = values.customer_delegation
      existing.customer_address = values.customer_address
      existing.customer_landmark = values.customer_landmark
      existing.customer_postal_code = values.customer_postal_code
      existing.delivery_notes = values.delivery_notes
      existing.address_version = values.address_version
    }
  }

  return [...usageByKey.values()].sort(
    (a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime(),
  )
}
