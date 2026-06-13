import type { UserContext } from './get-context'

export type ActiveCheckResult = { ok: true } | { ok: false; error: string }
export const SUBSCRIPTION_EXPIRED_MESSAGE =
  'Abonnement expiré. Choisissez un plan pour continuer.'

export function assertActive(context: UserContext): ActiveCheckResult {
  if (context.demoExpired) return { ok: false, error: 'SUBSCRIPTION_EXPIRED' }
  return { ok: true }
}

/** Pour les server actions qui retournent { error?: string }. */
export function requireActive(context: UserContext): { error: string } | null {
  const check = assertActive(context)
  return check.ok ? null : { error: SUBSCRIPTION_EXPIRED_MESSAGE }
}

/** Pour les API routes qui retournent une Response. */
export function requireActiveResponse(context: UserContext): Response | null {
  const check = assertActive(context)
  if (!check.ok) {
    return Response.json(
      { error: SUBSCRIPTION_EXPIRED_MESSAGE, code: check.error },
      { status: 403 }
    )
  }
  return null
}
