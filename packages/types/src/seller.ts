export type SellerPlan = 'starter' | 'pro' | 'business'

export interface Seller {
  id: string
  email: string
  name: string
  phone?: string
  plan: SellerPlan
  subscription_end?: string
  slug?: string
  created_at: string
}
