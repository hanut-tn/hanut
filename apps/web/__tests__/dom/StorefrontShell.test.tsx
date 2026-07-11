import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import type { CheckoutData } from '@/components/storefront/CheckoutForm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import StorefrontShell from '@/components/storefront/StorefrontShell'

const SLUG = 'ma-boutique'
const SESSION_KEY = `hanut_checkout_${SLUG}`

const checkoutData: CheckoutData = {
  name: 'Fatima Ben Ali',
  phone: '20123456',
  email: 'fatima@example.com',
  governorate: 'Tunis',
  city: 'Tunis',
  address: '12 rue de la Liberté',
  landmark: '',
  deliveryNotes: '',
}

function renderShell(products: StorefrontProduct[] = []) {
  return render(
    <StorefrontShell
      sellerSlug={SLUG}
      sellerName="Ma Boutique"
      shopDescription={null}
      logoUrl={null}
      products={products}
      categories={[]}
    />
  )
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

describe('StorefrontShell — restauration sessionStorage du tunnel checkout', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('restaure le panier et reprend à l’étape OTP quand une session valide existe', () => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      cart: [{
        productId: 'p1', productName: 'T-shirt', productImage: null,
        productPrice: 50, variantLabel: null, quantity: 2, maxQty: 10,
        key: 'p1::no-variant',
      }],
      step: 'otp',
      checkoutData,
      savedAt: Date.now(),
    }))

    renderShell()

    // On reprend directement à l'étape OTP (pas au catalogue).
    expect(screen.getByText(checkoutData.email)).toBeInTheDocument()
    expect(screen.getByText(/session a été restaurée/i)).toBeInTheDocument()
  })

  it('ignore une session expirée (> 10 minutes) et repart du catalogue', () => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      cart: [{
        productId: 'p1', productName: 'T-shirt', productImage: null,
        productPrice: 50, variantLabel: null, quantity: 1, maxQty: 10,
        key: 'p1::no-variant',
      }],
      step: 'otp',
      checkoutData,
      savedAt: Date.now() - 11 * 60 * 1000,
    }))

    renderShell()

    expect(screen.queryByText(checkoutData.email)).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ignore un payload sessionStorage corrompu sans planter', () => {
    window.sessionStorage.setItem(SESSION_KEY, '{not-json')

    expect(() => renderShell()).not.toThrow()
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ne restaure pas l’étape OTP sans checkoutData sauvegardé', () => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      cart: [],
      step: 'otp',
      checkoutData: null,
      savedAt: Date.now(),
    }))

    renderShell()

    expect(screen.queryByText(checkoutData.email)).not.toBeInTheDocument()
  })
})

describe('StorefrontShell — rendu RTL', () => {
  it('démarre en LTR (français par défaut)', () => {
    const { container } = renderShell()
    const root = container.querySelector('[dir]')
    expect(root).toHaveAttribute('dir', 'ltr')
  })

  it('bascule en dir="rtl" et police arabe après le changement de langue', async () => {
    const { container } = renderShell()
    const toggle = screen.getByText('🇹🇳 العربية')

    fireEvent.click(toggle)

    const root = container.querySelector('[dir]')
    expect(root).toHaveAttribute('dir', 'rtl')
    expect(root).toHaveClass('font-arabic')
  })
})
