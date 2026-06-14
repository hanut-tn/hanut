export type CarrierName = 'intigo' | 'navex' | 'adex' | 'aramex' | 'bestdelivery'
export type DeliveryType = 'self' | 'carrier'

export interface Delivery {
  id: string
  order_id: string
  delivery_type: DeliveryType
  carrier: CarrierName | null
  tracking_number: string | null
  carrier_status: string | null
  fee: number | null
  vendor_note: string | null
  cod_collected: boolean
  cod_reversed: boolean
  cod_reversed_at: string | null
  cod_reversed_amount: number
  cod_reversed_by: string | null
  created_at: string
  delivered_at: string | null
}

export interface CreateDeliveryInput {
  order_id: string
  delivery_type: DeliveryType
  carrier?: CarrierName | null
  tracking_number?: string | null
  fee?: number | null
  vendor_note?: string | null
}
