type Step = { id: number; label: string; skippable: boolean }

type Props = {
  current: number
  total: number
  steps: Step[]
}

export default function ProgressBar({ current, total, steps }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-900">
          {steps[current - 1]?.label}
        </span>
        <span className="text-xs text-gray-400">
          {current} / {total}
        </span>
      </div>

      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= current - 1 ? '#16a34a' : '#e5e7eb',
            }}
          />
        ))}
      </div>
    </div>
  )
}
