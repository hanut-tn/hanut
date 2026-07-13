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

const TEMPLATE_FONTS: Partial<Record<StorefrontTemplate, { url: string; attr: string }>> = {
  luxe: {
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap',
    attr: 'playfair',
  },
  fresh: {
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
    attr: 'nunito',
  },
}

/** Charge la police Google Fonts d'un template, si besoin (idempotent). Les
 * templates "mode" et "dark" s'appuient sur Inter, déjà chargée par le
 * layout global. */
export function loadTemplateFont(template: StorefrontTemplate): void {
  if (typeof document === 'undefined') return
  const font = TEMPLATE_FONTS[template]
  if (!font) return
  if (document.querySelector(`link[data-font="${font.attr}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = font.url
  link.setAttribute('data-font', font.attr)
  document.head.appendChild(link)
}
