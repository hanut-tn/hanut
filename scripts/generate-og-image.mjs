// Usage : node scripts/generate-og-image.mjs (depuis la racine du repo)
// Génère l'image Open Graph 1200×628 de Hanut.
// Fond brand-600, logo blanc en haut, titre + accroche essai.
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'

const LOGO_PATH = '../apps/web/public/logo-horizontal-blanc.svg'
const OUT_PATH = '../apps/web/public/og-image.png'

// Contenu du logo blanc (viewBox="-56 0 810 260"), imbriqué tel quel.
const logoSvg = readFileSync(new URL(LOGO_PATH, import.meta.url), 'utf8')
  .replace(/<\?xml[^>]*\?>/, '')
  .replace('<svg ', '<svg x="80" y="88" width="360" height="116" ')

const svg = `
<svg width="1200" height="628" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
  <!-- Fond brand-600 avec léger dégradé vers brand-700 -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16A34A"/>
      <stop offset="1" stop-color="#15803D"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="628" fill="url(#bg)"/>

  <!-- Formes décoratives inspirées de l'OG actuelle -->
  <rect x="820" y="150" width="290" height="330" rx="42" fill="#22C55E" opacity="0.55"/>
  <rect x="900" y="210" width="290" height="330" rx="42" fill="#4ADE80" opacity="0.5"/>
  <rect x="980" y="270" width="290" height="330" rx="42" fill="#F97316"/>

  <!-- Logo blanc -->
  ${logoSvg}

  <!-- Titre -->
  <text x="84" y="330" font-family="Helvetica, Arial, sans-serif" font-weight="700"
        font-size="58" fill="#FFFFFF" letter-spacing="-1">Gérez vos commandes</text>
  <text x="84" y="400" font-family="Helvetica, Arial, sans-serif" font-weight="700"
        font-size="58" fill="#FFFFFF" letter-spacing="-1">WhatsApp et Instagram</text>

  <!-- Badge accroche -->
  <rect x="84" y="460" width="700" height="72" rx="36" fill="#FFFFFF"/>
  <text x="120" y="507" font-family="Helvetica, Arial, sans-serif" font-weight="600"
        font-size="30" fill="#15803D">Essai Pro 14 jours · Aucune carte bancaire</text>
</svg>
`

const png = await sharp(Buffer.from(svg)).resize(1200, 628).png().toBuffer()
writeFileSync(new URL(OUT_PATH, import.meta.url), png)
const meta = await sharp(png).metadata()
console.log(`OK ${OUT_PATH} — ${meta.width}×${meta.height}, ${Math.round(png.length / 1024)} Ko`)
