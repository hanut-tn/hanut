'use client'

import { useEffect } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Déplace le focus dans le conteneur à l'ouverture, le piège (Tab/Shift+Tab
 * bouclent entre premier et dernier élément focusable), et le restaure sur
 * l'élément précédemment actif à la fermeture.
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    // Ne vole pas le focus si un champ a déjà pris la main via autoFocus.
    if (!container.contains(document.activeElement)) {
      focusables()[0]?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [containerRef, active])
}
