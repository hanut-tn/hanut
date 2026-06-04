'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface MobileNavContextType {
  isDrawerOpen: boolean
  isSheetOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  openSheet: () => void
  closeSheet: () => void
}

const MobileNavContext = createContext<MobileNavContextType | null>(null)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const pathname = usePathname()

  // Fermer drawer et sheet à chaque changement de route
  useEffect(() => {
    setIsDrawerOpen(false)
    setIsSheetOpen(false)
  }, [pathname])

  const openDrawer  = useCallback(() => setIsDrawerOpen(true),  [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
  const openSheet   = useCallback(() => setIsSheetOpen(true),   [])
  const closeSheet  = useCallback(() => setIsSheetOpen(false),  [])

  return (
    <MobileNavContext.Provider value={{ isDrawerOpen, isSheetOpen, openDrawer, closeDrawer, openSheet, closeSheet }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider')
  return ctx
}
