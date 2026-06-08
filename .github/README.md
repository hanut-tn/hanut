# CI/CD Hanut

## Workflows

### `migrations.yml`
Se déclenche quand des fichiers SQL sont modifiés (`supabase/migrations/**` ou `supabase/schema.sql`).

1. Lance PostgreSQL 15 dans Docker
2. Applique `schema.test.sql` (mocks auth Supabase pour CI)
3. Applique `schema.sql` (schéma de base)
4. Applique toutes les migrations dans l'ordre alphabétique
5. Vérifie que les 8 tables critiques existent
6. Vérifie que les fonctions `create_order_with_stock` et `get_seller_id` existent
7. Échoue immédiatement si une migration contient une erreur SQL

### `tests.yml`
Se déclenche à chaque push sur `main` ou `develop`.

1. Type check TypeScript
2. Tests Vitest (41 tests)
3. Build Next.js production

## Ajouter une migration

1. Créer le fichier dans `supabase/migrations/` avec le format `YYYYMMDD_description.sql`
2. Pousser sur GitHub — le CI vérifie automatiquement
3. Si le CI passe → appliquer manuellement dans Supabase Dashboard → SQL Editor

## Fichiers

| Fichier | Rôle |
|---------|------|
| `supabase/schema.sql` | Schéma de base (production) |
| `supabase/schema.test.sql` | Mocks auth pour CI uniquement |
| `supabase/migrations/*.sql` | Migrations incrémentales |
