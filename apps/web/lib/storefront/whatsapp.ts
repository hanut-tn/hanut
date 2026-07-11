export type WhatsAppOrderLine = {
  name: string
  variant: string | null
  quantity: number
  lineTotal: number
}

type BuildWhatsAppMessageParams = {
  orderNumber: string
  shopName: string
  lines: WhatsAppOrderLine[]
  total: number
  trackingUrl: string
  lang: 'fr' | 'ar'
}

function formatLine(line: WhatsAppOrderLine, lang: 'fr' | 'ar'): string {
  const variant = line.variant ? ` / ${line.variant}` : ''
  const qty = line.quantity > 1 ? ` × ${line.quantity}` : ''
  const unit = lang === 'ar' ? 'د.ت' : 'DT'
  return `• ${line.name}${variant}${qty} — ${line.lineTotal} ${unit}`
}

export function buildWhatsAppMessage({
  orderNumber, shopName, lines, total, trackingUrl, lang,
}: BuildWhatsAppMessageParams): string {
  const items = lines.map(l => formatLine(l, lang)).join('\n')

  if (lang === 'ar') {
    return [
      '✅ تم تأكيد طلبي!',
      '',
      `🛍️ ${shopName}`,
      `📦 الطلب رقم ${orderNumber}`,
      '',
      items,
      '',
      `💰 المجموع: ${total} د.ت`,
      '🚚 الدفع عند الاستلام',
      '',
      '👉 تتبع طلبي:',
      trackingUrl,
    ].join('\n')
  }

  return [
    '✅ Ma commande est confirmée !',
    '',
    `🛍️ ${shopName}`,
    `📦 Commande #${orderNumber}`,
    '',
    items,
    '',
    `💰 Total : ${total} DT`,
    '🚚 Paiement à la livraison',
    '',
    '👉 Suivre ma commande :',
    trackingUrl,
  ].join('\n')
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
