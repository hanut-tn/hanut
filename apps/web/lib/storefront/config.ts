// Traduit la config visuelle du vendeur (StorefrontConfig) en CSS variables
// et styles inline. Rien ici ne doit jamais être interpolé dans un
// `className` — voir la note dans packages/types/src/storefront.ts.

import type { CSSProperties } from 'react'
import type { StorefrontConfig, StorefrontTemplate } from '@hanut/types'
import { STOREFRONT_TEMPLATES } from '@hanut/types'
import { adjustColor } from './colors'

export function buildCssVariables(config: StorefrontConfig): CSSProperties {
  const template = STOREFRONT_TEMPLATES[config.template]

  // Fond du header : dégradé de la couleur d'accent, noir plein, ou crème
  // selon le template — stocké tel quel dans une CSS var (une valeur de
  // `background` complète, y compris `linear-gradient(...)`, est un token
  // CSS valide comme n'importe quelle autre chaîne).
  const headerBg = template.headerStyle === 'gradient'
    ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
    : template.headerStyle === 'dark'
      ? '#000000'
      : '#faf8f5'
  const headerText = template.headerStyle === 'cream' ? '#1a1a1a' : '#ffffff'

  return {
    '--primary': config.primary_color,
    '--primary-dark': adjustColor(config.primary_color, -15),
    '--primary-light': adjustColor(config.primary_color, 40),

    '--page-bg': template.pageBg,
    '--card-bg': template.cardBg,
    '--text-primary': template.textPrimary,
    '--text-secondary': template.textSecondary,
    '--card-radius': template.cardRadius,
    '--card-shadow': template.cardShadow,
    '--font-family': template.fontFamily,

    '--header-bg': headerBg,
    '--header-text': headerText,

    backgroundColor: template.pageBg,
    fontFamily: template.fontFamily,
    color: template.textPrimary,
  } as CSSProperties
}

/** Charge la police Google Fonts d'un template, si besoin (idempotent). Seul
 * le template "luxe" utilise une police externe (Playfair Display) — les
 * autres s'appuient sur Inter, déjà chargée par le layout global. */
export function loadTemplateFont(template: StorefrontTemplate): void {
  if (template !== 'luxe' || typeof document === 'undefined') return
  if (document.querySelector('link[data-font="playfair"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap'
  link.setAttribute('data-font', 'playfair')
  document.head.appendChild(link)
}
