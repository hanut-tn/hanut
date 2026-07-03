import type { Lang } from './use-lang'

export type { Lang }

export interface TrackingDict {
  common: {
    langToggle: string
  }
  header: {
    title: string
  }
  card: {
    placedOn: (date: string) => string
    totalOrder: string
  }
  status: {
    pending: string
    confirmedOrNew: string
    shipped: string
    shippedSelf: string
    delivered: string
    returned: string
    cancelled: string
    updating: string
  }
  steps: {
    received: string
    confirmed: string
    shipped: string
    delivered: string
    cancelledLabel: string
    returnedLabel: string
  }
  timeline: {
    title: string
  }
  selfDelivery: {
    title: string
    description: string
    contactSeller: string
  }
  carrier: {
    title: string
    trackingUnavailable: string
    trackMyParcelOn: (carrierLabel: string) => string
  }
  refresh: {
    button: string
    updatedAt: (time: string) => string
    autoUpdateNotice: string
  }
  footer: {
    poweredBy: string
  }
}

export const trackingTranslations: Record<Lang, TrackingDict> = {
  fr: {
    common: {
      langToggle: '🇹🇳 العربية',
    },
    header: {
      title: 'Suivi de commande',
    },
    card: {
      placedOn: date => `Passée le ${date}`,
      totalOrder: 'Total commande',
    },
    status: {
      pending: 'Votre commande est en attente de confirmation. Le vendeur vous contactera bientôt.',
      confirmedOrNew: 'Votre commande est confirmée ! On prépare votre colis.',
      shipped: 'Votre colis est en route ! Livraison prévue sous 24–48h.',
      shippedSelf: 'Votre commande est prise en charge directement par la boutique.',
      delivered: 'Votre commande a été livrée. Merci pour votre confiance !',
      returned: "Votre commande a été retournée. Contactez le vendeur pour plus d'informations.",
      cancelled: 'Votre commande a été annulée. Contactez le vendeur pour plus d’informations.',
      updating: 'Statut en cours de mise à jour.',
    },
    steps: {
      received: 'Commande reçue',
      confirmed: 'Commande confirmée',
      shipped: 'En cours de livraison',
      delivered: 'Livrée',
      cancelledLabel: 'Commande annulée',
      returnedLabel: 'Commande retournée',
    },
    timeline: {
      title: 'Suivi',
    },
    selfDelivery: {
      title: 'Prise en charge par la boutique',
      description: "La boutique effectue la livraison directement. Le vendeur vous contactera pour confirmer l'heure et le lieu de livraison.",
      contactSeller: 'Contacter le vendeur',
    },
    carrier: {
      title: 'Suivi transporteur',
      trackingUnavailable: 'Numéro de suivi non disponible',
      trackMyParcelOn: carrierLabel => `Suivre mon colis sur ${carrierLabel}`,
    },
    refresh: {
      button: 'Actualiser',
      updatedAt: time => `Mis à jour à ${time}`,
      autoUpdateNotice: 'Mise à jour automatique toutes les 30 secondes',
    },
    footer: {
      poweredBy: 'Propulsé par Hanut',
    },
  },
  ar: {
    common: {
      langToggle: '🇫🇷 Français',
    },
    header: {
      title: 'تتبع الطلب',
    },
    card: {
      placedOn: date => `تم الطلب في ${date}`,
      totalOrder: 'مجموع الطلب',
    },
    status: {
      pending: 'طلبك في انتظار التأكيد. سيتصل بك البائع قريبًا.',
      confirmedOrNew: 'تم تأكيد طلبك! يتم الآن تحضير طردك.',
      shipped: 'طردك في الطريق! التوصيل متوقع خلال 24 إلى 48 ساعة.',
      shippedSelf: 'طلبك يتم التكفل به مباشرة من طرف المتجر.',
      delivered: 'تم توصيل طلبك. شكرًا لثقتك بنا!',
      returned: 'تم إرجاع طلبك. تواصل مع البائع لمزيد من المعلومات.',
      cancelled: 'تم إلغاء طلبك. تواصل مع البائع لمزيد من المعلومات.',
      updating: 'جارٍ تحديث الحالة.',
    },
    steps: {
      received: 'تم استلام الطلب',
      confirmed: 'تم تأكيد الطلب',
      shipped: 'قيد التوصيل',
      delivered: 'تم التوصيل',
      cancelledLabel: 'طلب ملغى',
      returnedLabel: 'طلب مُرجَع',
    },
    timeline: {
      title: 'التتبع',
    },
    selfDelivery: {
      title: 'التكفل به من طرف المتجر',
      description: 'يقوم المتجر بالتوصيل مباشرة. سيتصل بك البائع لتأكيد وقت ومكان التوصيل.',
      contactSeller: 'التواصل مع البائع',
    },
    carrier: {
      title: 'تتبع شركة التوصيل',
      trackingUnavailable: 'رقم التتبع غير متوفر',
      trackMyParcelOn: carrierLabel => `تتبع طردي عبر ${carrierLabel}`,
    },
    refresh: {
      button: 'تحديث',
      updatedAt: time => `تم التحديث في ${time}`,
      autoUpdateNotice: 'تحديث تلقائي كل 30 ثانية',
    },
    footer: {
      poweredBy: 'بدعم من Hanut',
    },
  },
}
