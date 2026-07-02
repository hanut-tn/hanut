# Gestion des migrations Supabase

## Créer une nouvelle migration

```bash
supabase migration new nom_de_la_migration
# Crée : supabase/migrations/YYYYMMDDHHMMSS_nom_de_la_migration.sql
```

Édite le fichier créé, écris le SQL, puis applique.

## Appliquer en staging

```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[REF_STAGING].supabase.co:5432/postgres"
```

## Appliquer en prod

```bash
supabase db push
# (requiert : supabase link --project-ref tmpwosqltbfkruuqxuoh)
```

## Vérifier l'état des migrations

```bash
supabase migration list          # montre ce qui est appliqué vs en attente
```

## Règles impératives

- **Ne jamais modifier** une migration déjà appliquée en prod — crée une nouvelle migration corrective
- **Toujours tester sur staging** avant d'appliquer en prod
- **Ne jamais utiliser le SQL Editor Supabase** pour les changements de schema structurels
- Les migrations sont **immuables** une fois appliquées

## Workflow standard

```
1. supabase migration new ma_feature
2. Éditer supabase/migrations/[timestamp]_ma_feature.sql
3. supabase db push --db-url [URL_STAGING]   # test staging
4. git add + git commit + git push
5. supabase db push                           # appliquer prod
```

## En cas de problème

Si la prod et le tracking CLI sont désynchronisés :
```bash
./scripts/init-migration-tracking.sh [URL_PROD]
```
Ce script marque les migrations existantes comme appliquées sans les réexécuter.
**À utiliser une seule fois, uniquement si nécessaire.**
