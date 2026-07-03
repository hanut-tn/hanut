// Résolution d'origine sûre pour tout ce qui part par email (liens, logo).
// Partagé entre lib/auth-redirect.ts et lib/email.ts pour rester synchronisé —
// un domaine jugé inacceptable dans un lien doit l'être partout.

export function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.origin
  } catch {
    return null
  }
}

export function isLocalOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

export function isPrivateOrLocalOrigin(origin: string | null): boolean {
  if (!origin) return true
  try {
    const hostname = new URL(origin).hostname
    return (
      isLocalOrigin(origin) ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    )
  } catch {
    return true
  }
}

// URLs de déploiement Vercel auto-générées (*.vercel.app, y compris les
// alias de branche du type projet-git-branche-team.vercel.app) : jamais
// acceptables dans un lien ou une image envoyés par email — ni stables
// d'un déploiement à l'autre, ni le domaine attendu par l'utilisateur.
export function isVercelDeploymentOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    return new URL(origin).hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}
