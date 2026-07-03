import { vi } from 'vitest'

// after() (Next.js 15) exige un vrai contexte de requête Next.js, absent
// quand un test appelle un handler de route directement. On le remplace par
// un simple appel immédiat pour que les routes qui l'utilisent restent
// testables sans changer de comportement observable (le callback s'exécute
// toujours, juste de façon synchrone plutôt que différée après la réponse).
vi.mock('next/server', async importOriginal => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: (fn: () => unknown) => {
      fn()
    },
  }
})
