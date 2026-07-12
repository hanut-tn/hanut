// Traduit la config visuelle du vendeur (StorefrontConfig) en CSS variables
// et styles inline. Rien ici ne doit jamais être interpolé dans un
// `className` — voir la note dans packages/types/src/storefront.ts.

import type { CSSProperties } from 'react'
import type { StorefrontConfig, StorefrontColors, StorefrontTypography, StorefrontCards } from '@hanut/types'
import {
  STOREFRONT_FONTS, FONT_SIZE_SCALE, CARD_RADIUS_VALUES, CARD_SHADOW_VALUES, IMAGE_RATIO_VALUES,
} from '@hanut/types'
import { adjustColor } from './colors'

/** Patch partiel de StorefrontConfig — chaque sous-objet est lui-même partiel
 * (contrairement à `Partial<StorefrontConfig>`, où `colors` présent impliquerait
 * les 5 couleurs). Utilisé pour les mises à jour incrémentales de l'éditeur. */
export type StorefrontConfigPatch = {
  colors?: Partial<StorefrontColors>
  typography?: Partial<StorefrontTypography>
  cards?: Partial<StorefrontCards>
  layout?: StorefrontConfig['layout']
}

export function buildCssVariables(config: StorefrontConfig): CSSProperties {
  const font = STOREFRONT_FONTS[config.typography.font]
  const fontSize = FONT_SIZE_SCALE[config.typography.size]
  const cardRadius = CARD_RADIUS_VALUES[config.cards.radius].css
  const cardShadow = CARD_SHADOW_VALUES[config.cards.shadow].css
  const imageAspect = IMAGE_RATIO_VALUES[config.cards.imageRatio].css

  return {
    '--primary': config.colors.primary,
    '--primary-dark': adjustColor(config.colors.primary, -15),
    '--primary-light': adjustColor(config.colors.primary, 40),
    '--page-bg': config.colors.pageBg,
    '--card-bg': config.colors.cardBg,
    '--text-primary': config.colors.textPrimary,
    '--text-secondary': config.colors.textSecondary,
    '--card-radius': cardRadius,
    '--card-shadow': cardShadow,
    '--image-aspect': imageAspect,
    '--font-family': font.family,
    '--font-size-scale': fontSize.scale,
    backgroundColor: config.colors.pageBg,
    fontFamily: font.family,
    color: config.colors.textPrimary,
  } as CSSProperties
}

/** Fusionne en profondeur (colors/typography/cards) plutôt qu'un spread superficiel — un
 * patch partiel (une seule couleur changée, par ex.) ne doit pas écraser le reste de l'objet
 * imbriqué. Utilisé côté serveur (actions.ts) et côté client (éditeur, état local en direct). */
export function mergeStorefrontConfig(
  base: StorefrontConfig,
  ...patches: (StorefrontConfigPatch | null | undefined)[]
): StorefrontConfig {
  return patches.reduce<StorefrontConfig>((acc, patch) => {
    if (!patch) return acc
    return {
      colors: { ...acc.colors, ...patch.colors },
      typography: { ...acc.typography, ...patch.typography },
      cards: { ...acc.cards, ...patch.cards },
      layout: patch.layout ?? acc.layout,
    }
  }, base)
}

/** Charge une police Google Fonts côté client (idempotent, une seule balise par police). */
export function loadGoogleFont(fontKey: keyof typeof STOREFRONT_FONTS): void {
  const font = STOREFRONT_FONTS[fontKey]
  if (!font || typeof document === 'undefined') return
  if (document.querySelector(`link[data-font="${fontKey}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = font.url
  link.setAttribute('data-font', fontKey)
  document.head.appendChild(link)
}
