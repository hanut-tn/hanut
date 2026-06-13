export type CarrierName = 'intigo' | 'navex' | 'adex' | 'aramex' | 'bestdelivery'

export interface Delivery {
  id: string
  order_id: string
  carrier: CarrierName
  tracking_number?: string
  carrier_status?: string
  fee?: number
  cod_collected: boolean
  cod_reversed: boolean
  cod_reversed_at?: string | null
  cod_reversed_amount?: number
  cod_reversed_by?: string | null
  created_at: string
  delivered_at?: string
}

export interface CreateDeliveryInput {
  order_id: string
  carrier: CarrierName
}
