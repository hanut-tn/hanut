interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding]

  return (
    <div className={`bg-white border border-[#E7E5E4] rounded-xl shadow-sm ${paddingClass} ${className}`}>
      {children}
    </div>
  )
}
