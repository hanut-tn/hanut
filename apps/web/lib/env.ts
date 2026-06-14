const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const

const securityEnvVars = [
  'TURNSTILE_SECRET_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
] as const

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key])
  const missingSecurity = securityEnvVars.filter(key => !process.env[key])

  if (missingSecurity.length > 0) {
    console.warn([
      '========================================',
      '  HANUT — Variables anti-spam manquantes :',
      ...missingSecurity.map(k => `  ! ${k}`),
      '  Les formulaires publics seront bloqués en production',
      '  tant que Turnstile n’est pas configuré.',
      '========================================',
    ].join('\n'))
  }

  if (missing.length === 0) return

  const msg = [
    '========================================',
    "  HANUT — Variables d'environnement manquantes :",
    ...missing.map(k => `  ✗ ${k}`),
    "  L'application ne peut pas démarrer correctement.",
    '  Vérifiez votre .env.local ou les variables Vercel.',
    '========================================',
  ].join('\n')

  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  } else {
    console.warn(msg)
  }
}
