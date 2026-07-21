export type SellerPlan = 'starter' | 'pro' | 'business'

export interface Seller {
  id: string
  email: string
  name: string
  phone?: string | null
  plan: SellerPlan
  subscription_end?: string | null
  slug?: string | null
  onboarding_completed?: boolean
  /** Étape courante de l'onboarding obligatoire (/setup) : 1=Bienvenue, 2=Style, 3=Produit, 4=Live, 5=Terminé. */
  onboarding_step?: number
  onboarding_steps?: {
    link_copied?: boolean
    first_order?: boolean
    [key: string]: boolean | undefined
  } | null
  onboarding_dismissed_until?: string | null
  created_at: string
}
