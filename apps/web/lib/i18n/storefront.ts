import type { Lang } from './use-lang'
import { orderFormTranslations, type OrderFormDict } from './order-form'

export type { Lang }

// Le storefront réutilise l'intégralité du dictionnaire du formulaire de
// commande (labels client, erreurs, OTP, écran succès) et ajoute les
// sections propres à la boutique : catalogue, panier, checkout.
export interface StorefrontDict extends OrderFormDict {
  shop: {
    emptyTitle: string
    emptyDesc: string
    deliveryBadge: string
    outOfStock: string
    lowStock: (qty: number) => string
    fromPrice: (price: number) => string
    variantsCount: (count: number) => string
    add: string
    added: string
  }
  quick: {
    chooseVariant: string
    quantity: string
    available: (qty: number) => string
    inCart: (qty: number) => string
    addToCart: (total: number) => string
  }
  cart: {
    title: string
    itemsCount: (count: number) => string
    total: string
    codNote: string
    checkout: string
    empty: string
    continueShopping: string
    remove: string
    maxStock: string
    cartFull: string
  }
  checkoutExtra: {
    title: string
    backToShop: string
    recapTitle: string
    editCart: string
  }
  otpExtra: {
    backToShop: string
    stockGone: string
  }
  confirmExtra: {
    contactSoon: string
    itemsTotal: string
  }
}

const fr: StorefrontDict = {
  ...orderFormTranslations.fr,
  shop: {
    emptyTitle: 'Boutique en préparation',
    emptyDesc: 'Revenez bientôt !',
    deliveryBadge: 'Tunisie · Paiement à la livraison',
    outOfStock: 'Rupture de stock',
    lowStock: qty => `Plus que ${qty}`,
    fromPrice: price => `À partir de ${price} DT`,
    variantsCount: count => `${count} variante${count > 1 ? 's' : ''}`,
    add: 'Ajouter',
    added: '✓ Ajouté',
  },
  quick: {
    chooseVariant: 'Choisissez une variante',
    quantity: 'Quantité',
    available: qty => `${qty} dispo`,
    inCart: qty => `${qty} déjà dans le panier`,
    addToCart: total => `Ajouter au panier — ${total} DT`,
  },
  cart: {
    title: 'Votre panier',
    itemsCount: count => `${count} article${count > 1 ? 's' : ''}`,
    total: 'Total',
    codNote: 'Paiement à la livraison (COD)',
    checkout: 'Commander',
    empty: 'Votre panier est vide',
    continueShopping: 'Continuer mes achats',
    remove: 'Retirer',
    maxStock: 'Stock maximum atteint pour cet article',
    cartFull: 'Panier plein (20 articles maximum)',
  },
  checkoutExtra: {
    title: 'Vos informations',
    backToShop: '← Retour à la boutique',
    recapTitle: 'Récapitulatif',
    editCart: 'Modifier le panier',
  },
  otpExtra: {
    backToShop: '← Retour à la boutique',
    stockGone: "Le stock d'un article de votre panier vient d'être épuisé. Ajustez votre panier et réessayez.",
  },
  confirmExtra: {
    contactSoon: 'Vous serez contacté sous 24h pour confirmer la livraison.',
    itemsTotal: 'Total',
  },
}

const ar: StorefrontDict = {
  ...orderFormTranslations.ar,
  shop: {
    emptyTitle: 'المتجر قيد التحضير',
    emptyDesc: 'عد قريبًا!',
    deliveryBadge: 'تونس · الدفع عند الاستلام',
    outOfStock: 'نفدت الكمية',
    lowStock: qty => `بقي ${qty} فقط`,
    fromPrice: price => `ابتداءً من ${price} د.ت`,
    variantsCount: count => `${count} أنواع`,
    add: 'أضف',
    added: '✓ تمت الإضافة',
  },
  quick: {
    chooseVariant: 'اختر نوعًا',
    quantity: 'الكمية',
    available: qty => `${qty} متوفر`,
    inCart: qty => `${qty} في السلة`,
    addToCart: total => `أضف إلى السلة — ${total} د.ت`,
  },
  cart: {
    title: 'سلتك',
    itemsCount: count => `${count} منتج`,
    total: 'المجموع',
    codNote: 'الدفع عند الاستلام',
    checkout: 'اطلب الآن',
    empty: 'سلتك فارغة',
    continueShopping: 'مواصلة التسوق',
    remove: 'حذف',
    maxStock: 'بلغت الكمية القصوى المتوفرة لهذا المنتج',
    cartFull: 'السلة ممتلئة (20 منتجًا كحد أقصى)',
  },
  checkoutExtra: {
    title: 'معلوماتك',
    backToShop: 'العودة إلى المتجر ←',
    recapTitle: 'ملخص الطلب',
    editCart: 'تعديل السلة',
  },
  otpExtra: {
    backToShop: 'العودة إلى المتجر ←',
    stockGone: 'نفدت كمية أحد منتجات سلتك للتو. عدّل سلتك وأعد المحاولة.',
  },
  confirmExtra: {
    contactSoon: 'سيتم الاتصال بك خلال 24 ساعة لتأكيد التوصيل.',
    itemsTotal: 'المجموع',
  },
}

export const storefrontTranslations: Record<Lang, StorefrontDict> = { fr, ar }
