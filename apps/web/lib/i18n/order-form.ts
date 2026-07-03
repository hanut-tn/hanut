import type { Lang } from './use-lang'

export type { Lang }

export interface OrderFormDict {
  common: {
    langToggle: string
    optional: string
  }
  header: {
    title: string
    at: string
  }
  customer: {
    sectionTitle: string
    fullNameLabel: string
    fullNamePlaceholder: string
    phoneLabel: string
    phoneDigitsHint: string
    phonePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    emailHelper: string
    governorateLabel: string
    governoratePlaceholder: string
    cityLabel: string
    cityPlaceholder: string
    addressLabel: string
    addressPlaceholder: string
    landmarkLabel: string
    landmarkPlaceholder: string
    postalCodeLabel: string
    postalCodePlaceholder: string
    delegationLabel: string
    delegationPlaceholder: string
  }
  order: {
    sectionTitle: string
    productLabel: string
    productPlaceholder: string
    stockAvailable: (qty: number) => string
    variantsQtyLabel: string
    variantDispo: (qty: number) => string
    variantExhausted: string
    variantExhaustedInline: string
    variantDispoInline: (qty: number) => string
    variantSingleLabel: string
    quantityLabel: string
    totalCod: string
  }
  notes: {
    label: string
    placeholder: string
  }
  errors: {
    phoneInvalidSubmit: string
    phoneInvalidBlur: string
    nameRequired: string
    emailInvalid: string
    governorateRequired: string
    cityRequired: string
    addressRequired: string
    postalCodeInvalid: string
    productRequired: string
    variantQtyRequired: string
    variantRequired: string
    stockAvailableError: (qty: number) => string
    turnstileFailed: string
    sendOtpError: string
    networkError: string
  }
  stockError: {
    variantUnavailableTitle: string
    productUnavailableTitle: string
    variantUnavailableDesc: string
    productUnavailableDesc: string
    chooseAnotherVariant: string
    chooseAnotherProduct: string
  }
  submit: {
    sendingCode: string
    orderButton: string
  }
  legal: {
    text: string
    privacyLink: string
  }
  otp: {
    title: string
    sentTo: string
    digitAriaLabel: (index: number) => string
    otpEmpty: string
    otpTurnstilePending: string
    otpInvalid: string
    otpSendError: string
    otpNetworkError: string
    verifying: string
    validateCode: string
    resendIn: (seconds: number) => string
    resendCode: string
    backToEdit: string
  }
  success: {
    title: string
    description: (sellerName: string) => string
    orderNumberLabel: string
    trackMyOrderTitle: string
    viewOrderStatus: string
    copyTrackingLink: string
    placeAnotherOrder: string
  }
}

export const orderFormTranslations: Record<Lang, OrderFormDict> = {
  fr: {
    common: {
      langToggle: '🇹🇳 العربية',
      optional: '(optionnel)',
    },
    header: {
      title: 'Passer une commande',
      at: 'chez',
    },
    customer: {
      sectionTitle: 'Vos coordonnées',
      fullNameLabel: 'Nom complet *',
      fullNamePlaceholder: 'Prénom Nom',
      phoneLabel: 'Numéro de téléphone *',
      phoneDigitsHint: '(8 chiffres)',
      phonePlaceholder: '22 123 456',
      emailLabel: 'Adresse email *',
      emailPlaceholder: 'vous@exemple.com',
      emailHelper: 'Un code de vérification vous sera envoyé par email.',
      governorateLabel: 'Gouvernorat *',
      governoratePlaceholder: 'Sélectionner…',
      cityLabel: 'Ville / Délégation *',
      cityPlaceholder: 'Sfax, Sakiet Ezzit…',
      addressLabel: 'Adresse détaillée *',
      addressPlaceholder: 'Ex: Rue Ibn Khaldoun, Résidence Les Jasmins',
      landmarkLabel: 'Repère pour le livreur',
      landmarkPlaceholder: 'Ex: Face à la pharmacie, 2ème étage, immeuble bleu...',
      postalCodeLabel: 'Code postal',
      postalCodePlaceholder: '3000',
      delegationLabel: 'Délégation précise',
      delegationPlaceholder: 'Si différente…',
    },
    order: {
      sectionTitle: 'Votre commande',
      productLabel: 'Produit *',
      productPlaceholder: 'Sélectionner un produit…',
      stockAvailable: qty => `Stock disponible : ${qty} unité${qty !== 1 ? 's' : ''}`,
      variantsQtyLabel: 'Variantes et quantités *',
      variantDispo: qty => `${qty} dispo`,
      variantExhausted: 'Épuisée',
      variantExhaustedInline: '— épuisée',
      variantDispoInline: qty => `— ${qty} dispo`,
      variantSingleLabel: 'Variante *',
      quantityLabel: 'Quantité *',
      totalCod: 'Total à payer (COD)',
    },
    notes: {
      label: 'Notes de livraison',
      placeholder: 'Appeler avant livraison, créneau préféré…',
    },
    errors: {
      phoneInvalidSubmit: 'Numéro de téléphone invalide. Entrez 8 chiffres (ex: 22 123 456).',
      phoneInvalidBlur: 'Numéro tunisien invalide. Ex: 22 123 456',
      nameRequired: 'Le nom complet est obligatoire.',
      emailInvalid: 'Adresse email invalide.',
      governorateRequired: 'Le gouvernorat est obligatoire.',
      cityRequired: 'La ville / délégation est obligatoire.',
      addressRequired: "L'adresse détaillée est obligatoire.",
      postalCodeInvalid: 'Le code postal doit contenir 4 chiffres.',
      productRequired: 'Sélectionnez un produit.',
      variantQtyRequired: 'Sélectionnez au moins une variante avec une quantité supérieure à 0.',
      variantRequired: 'Veuillez choisir une variante.',
      stockAvailableError: qty => `Stock disponible : ${qty} unité(s).`,
      turnstileFailed: 'Vérification anti-spam échouée. Réessayez.',
      sendOtpError: "Erreur lors de l'envoi du code. Réessayez.",
      networkError: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
    },
    stockError: {
      variantUnavailableTitle: "Cette variante n'est plus disponible",
      productUnavailableTitle: "Ce produit n'est plus disponible",
      variantUnavailableDesc: "Le stock de cette variante vient d'être épuisé. Choisissez une autre variante ou un autre produit.",
      productUnavailableDesc: "Le stock de ce produit vient d'être épuisé. Choisissez un autre produit ou revenez plus tard.",
      chooseAnotherVariant: 'Choisir une autre variante',
      chooseAnotherProduct: 'Choisir un autre produit',
    },
    submit: {
      sendingCode: 'Envoi du code…',
      orderButton: 'Commander',
    },
    legal: {
      text: "En passant cette commande, vous acceptez que vos données personnelles (nom, adresse e-mail, téléphone, adresse) soient transmises au vendeur pour le traitement de votre commande COD. Conformément à la loi organique n° 2004-63, vous disposez d'un droit d'accès et de rectification.",
      privacyLink: 'Politique de confidentialité',
    },
    otp: {
      title: 'Vérification par email',
      sentTo: 'Un code à 4 chiffres a été envoyé à',
      digitAriaLabel: index => `Chiffre ${index} du code de vérification`,
      otpEmpty: 'Entrez les 4 chiffres du code.',
      otpTurnstilePending: 'Vérification anti-spam en cours. Réessayez dans un instant.',
      otpInvalid: 'Code invalide. Réessayez.',
      otpSendError: "Erreur lors de l'envoi. Réessayez.",
      otpNetworkError: 'Erreur réseau. Réessayez.',
      verifying: 'Vérification…',
      validateCode: 'Valider le code',
      resendIn: seconds => `Renvoyer dans ${seconds}s`,
      resendCode: 'Renvoyer le code',
      backToEdit: '← Modifier mes informations',
    },
    success: {
      title: 'Commande envoyée !',
      description: sellerName => `Le vendeur ${sellerName} vous contactera pour confirmer votre commande.`,
      orderNumberLabel: 'Numéro de commande',
      trackMyOrderTitle: 'Suivre ma commande',
      viewOrderStatus: 'Voir le statut de ma commande',
      copyTrackingLink: 'Copier le lien de suivi',
      placeAnotherOrder: 'Passer une autre commande →',
    },
  },
  ar: {
    common: {
      langToggle: '🇫🇷 Français',
      optional: '(اختياري)',
    },
    header: {
      title: 'إتمام الطلب',
      at: 'لدى',
    },
    customer: {
      sectionTitle: 'معلومات الاتصال',
      fullNameLabel: 'الاسم الكامل *',
      fullNamePlaceholder: 'الاسم واللقب',
      phoneLabel: 'رقم الهاتف *',
      phoneDigitsHint: '(8 أرقام)',
      phonePlaceholder: '22 123 456',
      emailLabel: 'البريد الإلكتروني *',
      emailPlaceholder: 'vous@exemple.com',
      emailHelper: 'سيتم إرسال رمز تحقق إلى بريدك الإلكتروني.',
      governorateLabel: 'الولاية *',
      governoratePlaceholder: 'اختر…',
      cityLabel: 'المدينة / المعتمدية *',
      cityPlaceholder: 'صفاقس، ساقية الزيت…',
      addressLabel: 'العنوان بالتفصيل *',
      addressPlaceholder: 'مثال: نهج ابن خلدون، إقامة الياسمين',
      landmarkLabel: 'علامة مميزة للموصّل',
      landmarkPlaceholder: 'مثال: أمام الصيدلية، الطابق الثاني، عمارة زرقاء...',
      postalCodeLabel: 'الرمز البريدي',
      postalCodePlaceholder: '3000',
      delegationLabel: 'المعتمدية بالتحديد',
      delegationPlaceholder: 'إذا كانت مختلفة…',
    },
    order: {
      sectionTitle: 'طلبك',
      productLabel: 'المنتج *',
      productPlaceholder: 'اختر منتجًا…',
      stockAvailable: qty => `الكمية المتوفرة: ${qty} قطعة`,
      variantsQtyLabel: 'الأنواع والكميات *',
      variantDispo: qty => `${qty} متوفر`,
      variantExhausted: 'نفدت الكمية',
      variantExhaustedInline: '— نفدت الكمية',
      variantDispoInline: qty => `— ${qty} متوفر`,
      variantSingleLabel: 'النوع *',
      quantityLabel: 'الكمية *',
      totalCod: 'المجموع المستحق (الدفع عند الاستلام)',
    },
    notes: {
      label: 'ملاحظات التوصيل',
      placeholder: 'الاتصال قبل التوصيل، الوقت المفضل…',
    },
    errors: {
      phoneInvalidSubmit: 'رقم الهاتف غير صحيح. أدخل 8 أرقام (مثال: 22 123 456).',
      phoneInvalidBlur: 'رقم تونسي غير صحيح. مثال: 22 123 456',
      nameRequired: 'الاسم الكامل إجباري.',
      emailInvalid: 'البريد الإلكتروني غير صحيح.',
      governorateRequired: 'الولاية إجبارية.',
      cityRequired: 'المدينة / المعتمدية إجبارية.',
      addressRequired: 'العنوان بالتفصيل إجباري.',
      postalCodeInvalid: 'يجب أن يتكون الرمز البريدي من 4 أرقام.',
      productRequired: 'اختر منتجًا.',
      variantQtyRequired: 'اختر نوعًا واحدًا على الأقل بكمية أكبر من 0.',
      variantRequired: 'يرجى اختيار نوع.',
      stockAvailableError: qty => `الكمية المتوفرة: ${qty} قطعة.`,
      turnstileFailed: 'فشل التحقق من عدم كونك روبوتًا. أعد المحاولة.',
      sendOtpError: 'خطأ أثناء إرسال الرمز. أعد المحاولة.',
      networkError: 'خطأ في الشبكة. تحقق من اتصالك وأعد المحاولة.',
    },
    stockError: {
      variantUnavailableTitle: 'هذا النوع لم يعد متوفرًا',
      productUnavailableTitle: 'هذا المنتج لم يعد متوفرًا',
      variantUnavailableDesc: 'نفد مخزون هذا النوع للتو. اختر نوعًا آخر أو منتجًا آخر.',
      productUnavailableDesc: 'نفد مخزون هذا المنتج للتو. اختر منتجًا آخر أو عد لاحقًا.',
      chooseAnotherVariant: 'اختيار نوع آخر',
      chooseAnotherProduct: 'اختيار منتج آخر',
    },
    submit: {
      sendingCode: 'جارٍ إرسال الرمز…',
      orderButton: 'اطلب الآن',
    },
    legal: {
      text: 'بإتمامك لهذا الطلب، فإنك توافق على نقل بياناتك الشخصية (الاسم، البريد الإلكتروني، الهاتف، العنوان) إلى البائع لمعالجة طلبك بنظام الدفع عند الاستلام. وفقًا للقانون الأساسي عدد 63 لسنة 2004، لك الحق في الاطلاع على بياناتك وتصحيحها.',
      privacyLink: 'سياسة الخصوصية',
    },
    otp: {
      title: 'التحقق عبر البريد الإلكتروني',
      sentTo: 'تم إرسال رمز مكون من 4 أرقام إلى',
      digitAriaLabel: index => `الرقم ${index} من رمز التحقق`,
      otpEmpty: 'أدخل الأرقام الأربعة للرمز.',
      otpTurnstilePending: 'التحقق من عدم كونك روبوتًا جارٍ. أعد المحاولة بعد قليل.',
      otpInvalid: 'رمز غير صحيح. أعد المحاولة.',
      otpSendError: 'خطأ أثناء الإرسال. أعد المحاولة.',
      otpNetworkError: 'خطأ في الشبكة. أعد المحاولة.',
      verifying: 'جارٍ التحقق…',
      validateCode: 'تأكيد الرمز',
      resendIn: seconds => `إعادة الإرسال بعد ${seconds} ثانية`,
      resendCode: 'إعادة إرسال الرمز',
      backToEdit: 'تعديل معلوماتي ←',
    },
    success: {
      title: 'تم إرسال الطلب!',
      description: sellerName => `سيتصل بك البائع ${sellerName} لتأكيد طلبك.`,
      orderNumberLabel: 'رقم الطلب',
      trackMyOrderTitle: 'تتبع طلبي',
      viewOrderStatus: 'عرض حالة طلبي',
      copyTrackingLink: 'نسخ رابط التتبع',
      placeAnotherOrder: 'تقديم طلب آخر ←',
    },
  },
}
