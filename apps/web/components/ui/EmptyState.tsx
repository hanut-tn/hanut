import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-[#F5F5F4] rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[#78716C] opacity-60" />
      </div>
      <p className="font-semibold text-[#1C1917] mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[#78716C] max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-[#16A34A] hover:text-[#15803D] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
