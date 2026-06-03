'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type MobileSidebarContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null)

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((current) => !current),
    }),
    [isOpen]
  )

  return (
    <MobileSidebarContext.Provider value={value}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext)

  if (!context) {
    throw new Error('useMobileSidebar must be used within MobileSidebarProvider')
  }

  return context
}
