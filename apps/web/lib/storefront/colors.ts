// Utilitaires couleur pour le thème de la mini boutique (--primary / --primary-dark).

export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

function normalizeHex(hex: string): string {
  const h = hex.trim().replace('#', '')
  if (h.length === 3) return h.split('').map(c => c + c).join('')
  return h
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map(n => n.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4; break
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s * 100, l * 100]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Ajuste la luminosité (points de %, positif = éclaircit, négatif = assombrit). */
export function adjustColor(hex: string, amount: number): string {
  if (!isValidHexColor(hex)) return hex
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  const newL = Math.max(0, Math.min(100, l + amount))
  const [nr, ng, nb] = hslToRgb(h, s, newL)
  return rgbToHex(nr, ng, nb)
}
