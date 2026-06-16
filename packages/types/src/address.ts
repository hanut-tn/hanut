export interface HanutAddress {
  customer_governorate: string
  customer_city: string
  customer_address: string
  customer_landmark: string
  customer_delegation?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
}

export interface HanutContactAddress extends HanutAddress {
  customer_name: string
  customer_phone: string
}
