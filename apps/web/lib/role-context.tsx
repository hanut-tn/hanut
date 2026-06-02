'use client'

import { createContext, useContext } from 'react'
import type { UserRole } from './get-context'

type RoleContextValue = {
  role: UserRole
  sellerId: string
  isSeller: boolean
}

const RoleContext = createContext<RoleContextValue>({
  role: 'admin',
  sellerId: '',
  isSeller: true,
})

export function RoleProvider({
  role,
  sellerId,
  isSeller,
  children,
}: RoleContextValue & { children: React.ReactNode }) {
  return (
    <RoleContext.Provider value={{ role, sellerId, isSeller }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const { role, sellerId, isSeller } = useContext(RoleContext)
  return {
    role,
    sellerId,
    isSeller,
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isReadonly: role === 'readonly',
    canWrite: role !== 'readonly',
    canManageTeam: role === 'admin',
    canSeeFinancials: role !== 'operator',
    canAccessSettings: role === 'admin',
  }
}
