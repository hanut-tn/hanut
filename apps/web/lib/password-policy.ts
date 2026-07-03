// Règle de mot de passe unique, utilisée à la création de compte, à la
// réinitialisation et à l'activation d'une invitation d'équipe — pour
// qu'un mot de passe créé via ces deux derniers flux ne soit jamais plus
// faible que celui exigé à l'inscription.

export const PASSWORD_CRITERIA = [
  { label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { label: 'Une majuscule (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un chiffre (0–9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial (!@#…)', test: (p: string) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
]

export const PASSWORD_ERROR_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'

export function isPasswordValid(password: string): boolean {
  return PASSWORD_CRITERIA.every(c => c.test(password))
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0
  const passed = PASSWORD_CRITERIA.filter(c => c.test(password)).length
  if (passed <= 1) return 1
  if (passed <= 3) return 2
  return 3
}
