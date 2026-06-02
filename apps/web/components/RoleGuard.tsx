'use client'

import { useRole } from '@/lib/role-context'
import type { UserRole } from '@/lib/get-context'

type Props = {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ roles, children, fallback = null }: Props) {
  const { role } = useRole()
  if (!roles.includes(role)) return <>{fallback}</>
  return <>{children}</>
}
