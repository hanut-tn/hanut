'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

export type OrderResult = {
  orderId: string
  trackingToken: string
  lines: Array<{
    name: string
    variant: string | null
    quantity: number
    lineTotal: number
  }>
  total: number
}

type Props = {
  result: OrderResult
  sellerName: string
  t: StorefrontDict
  onNewOrder: () => void
}

export default function OrderConfirmation({ result, sellerName, t, onNewOrder }: Props) {
  return (
    <div className="px-4 py-10 max-w-md mx-auto flex flex-col items-center text-center space-y-5">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center ring-8 ring-green-50/60">
        <CheckCircle2 className="w-10 h-10 text-[#16A34A]" strokeWidth={2} />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-[#1C1917]">{t.success.title}</h2>
        <p className="text-gray-500 mt-2 max-w-sm">{t.success.description(sellerName)}</p>
      </div>

      <div className="bg-[#F5F5F4] rounded-xl px-6 py-4 border-2 border-dashed border-[#D6D3D1]">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.success.orderNumberLabel}</p>
        <p className="text-xl font-bold text-[#0B5E46] tracking-wider font-mono">#{result.orderId}</p>
      </div>

      {/* Récap articles */}
      <div className="w-full bg-white border border-[#E7E5E4] rounded-2xl p-4 shadow-sm text-start">
        <ul className="space-y-1.5">
          {result.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-[#44403C] truncate">
                {line.name}
                {line.variant && <span className="text-[#78716C]"> · {line.variant}</span>}
                <span className="text-[#78716C]"> × {line.quantity}</span>
              </span>
              <span className="font-semibold text-[#1C1917] shrink-0 tabular-nums">{line.lineTotal} DT</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 pt-2.5 border-t border-[#E7E5E4] flex justify-between items-center">
          <span className="text-sm text-[#78716C]">{t.confirmExtra.itemsTotal}</span>
          <span className="text-lg font-extrabold text-[#0B5E46]">{result.total} DT</span>
        </div>
      </div>

      <p className="text-sm text-[#78716C]">{t.confirmExtra.contactSoon}</p>

      <a
        href={`/track/${result.trackingToken}`}
        className="flex items-center justify-center gap-2 min-h-[48px] w-full bg-[#16A34A] text-white font-semibold rounded-lg text-sm transition-all duration-150 ease-out hover:bg-[#15803D] active:scale-[0.98] touch-manipulation"
      >
        <ExternalLink className="w-4 h-4" />
        {t.success.viewOrderStatus}
      </a>

      <button
        type="button"
        onClick={onNewOrder}
        className="min-h-[44px] touch-manipulation text-sm font-medium text-[#16A34A] hover:text-[#15803D] hover:underline transition-colors"
      >
        {t.success.placeAnotherOrder}
      </button>
    </div>
  )
}
