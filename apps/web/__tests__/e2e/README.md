# Tests E2E — Hanut

Tests de bout en bout qui exécutent les vrais flows applicatifs
contre un Supabase local (pas des mocks).

## Prérequis

1. Installer Supabase CLI :
   ```bash
   npm install -g supabase
   ```

2. Démarrer Supabase local depuis la racine du monorepo :
   ```bash
   npx supabase start
   ```
   Cette commande applique les migrations et retourne les clés locales.

3. Copier les clés dans `apps/web/.env.test.local` :
   ```
   SUPABASE_TEST_URL=http://localhost:54321
   SUPABASE_TEST_ANON_KEY=<anon key from output>
   SUPABASE_TEST_SERVICE_KEY=<service_role key from output>
   ```

4. Lancer les tests E2E :
   ```bash
   cd apps/web
   npm run test:e2e
   ```

## Scripts disponibles

```json
"test:integration": "vitest run --config vitest.integration.config.ts",
"test:e2e":         "vitest run --config vitest.e2e.config.ts"
```

## Architecture des tests

- `integration/` — Tests bas niveau : RPCs, triggers, RLS directement
- `e2e/` — Tests haut niveau : flows complets simulant l'app réelle

## Nettoyage

Chaque test crée ses propres données et les supprime dans `afterEach/afterAll`.
Si un test échoue avant le nettoyage, utiliser :
```bash
npx supabase db reset
```
pour repartir d'une base propre.
