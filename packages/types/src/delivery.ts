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
  created_at: string
  delivered_at?: string
}

export interface CreateDeliveryInput {
  order_id: string
  carrier: CarrierName
}
