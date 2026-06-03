import { getOrderStatusConfig } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  pulseDot?: boolean
}

export function StatusBadge({ status, size = 'sm', pulseDot = false }: StatusBadgeProps) {
  const config = getOrderStatusConfig(status)

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium border
      ${config.bg} ${config.text} ${config.border}
      ${size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'}
    `.trim()}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}${pulseDot ? ' animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}
