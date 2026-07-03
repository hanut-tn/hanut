'use client'

import { Check, X } from 'lucide-react'
import { PASSWORD_CRITERIA, passwordStrength } from '@/lib/password-policy'

export default function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null
  const strength = passwordStrength(password)
  const bars = [1, 2, 3]
  const colors = { 1: '#EF4444', 2: '#F59E0B', 3: '#16A34A' }
  const labels = { 1: 'Faible', 2: 'Moyen', 3: 'Fort' }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        {bars.map(b => (
          <div
            key={b}
            className="h-1.5 flex-1 rounded-full transition-colors duration-200"
            style={{ background: strength >= b && strength > 0 ? colors[strength as 1 | 2 | 3] : '#E7E5E4' }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: strength > 0 ? colors[strength as 1 | 2 | 3] : '#78716C' }}>
        {strength > 0 ? labels[strength as 1 | 2 | 3] : ''}
      </p>
      <ul className="space-y-1">
        {PASSWORD_CRITERIA.map(c => {
          const ok = c.test(password)
          return (
            <li key={c.label} className="flex items-center gap-1.5 text-xs">
              {ok
                ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#16A34A' }} />
                : <X className="w-3.5 h-3.5 shrink-0 text-red-400" />}
              <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{c.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
