# Déploiement — Architecture 3 environnements Hanut

## Vue d'ensemble

| Environnement | URL | Supabase | Branche Git | Déclenchement |
|---|---|---|---|---|
| **Production** | hanut.tn | Projet `hanut` (prod) | `main` | Push sur `main` |
| **Staging** | hanut-staging.vercel.app | Projet `hanut-staging` | `staging` | Push sur `staging` |
| **Local** | localhost:3000 | `supabase start` local | toute branche | Manuel |

---

## Production

Les variables sont configurées dans Vercel → Project Settings → Environment Variables → Environment : **Production**.

Aucune intervention manuelle en dehors du processus de déploiement décrit ci-dessous.

---

## Staging

### Création initiale (à faire une fois)

**1. Créer le projet Supabase staging**

Dans le dashboard Supabase (supabase.com) :
- New Project → `hanut-staging`
- Région : même que le projet prod (pour minimiser la latence cross-région en cas de tests multi-projets)
- Mot de passe DB : en garder une trace dans un gestionnaire de mots de passe

**2. Appliquer les migrations**

```bash
# Récupérer l'URL de connexion du projet staging :
# Supabase Dashboard → hanut-staging → Settings → Database → Connection string (URI)

supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

Ou depuis le SQL Editor du dashboard staging, exécuter les fichiers `supabase/migrations/*.sql` dans l'ordre alphabétique.

**3. Configurer les variables dans Vercel**

Vercel → Project Settings → Environment Variables.

Pour chaque variable de la liste ci-dessous :
- Cliquer sur la variable → Edit
- Cocher uniquement **Preview**
- Cliquer sur "Add branch override" → branche `staging`
- Coller la valeur du projet staging

Variables à configurer (voir `apps/web/.env.staging.example`) :
- `NEXT_PUBLIC_SUPABASE_URL` → URL du projet `hanut-staging`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → clé anon de `hanut-staging`
- `SUPABASE_SERVICE_ROLE_KEY` → clé service_role de `hanut-staging`
- `NEXT_PUBLIC_APP_URL` → URL Vercel du staging (ex: `https://hanut-staging.vercel.app`)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → clé de test Cloudflare (`1x00000000000000000000AA`)
- `TURNSTILE_SECRET_KEY` → secret de test Cloudflare (`1x0000000000000000000000000000000AA`)
- `OPS_WEBHOOK_SECRET` → secret différent de la prod

**4. Créer et pousser la branche staging**

```bash
git checkout -b staging
git push -u origin staging
```

Vercel détecte automatiquement la branche et crée un déploiement Preview.

---

## Local

### Premier lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp apps/web/.env.local.example apps/web/.env.local
# Remplir les valeurs dans .env.local

# 3. Démarrer Supabase local (Docker requis)
npx supabase start

# 4. Injecter les credentials locaux dans .env.local
# Copier les valeurs affichées par `supabase start` :
#   API URL → NEXT_PUBLIC_SUPABASE_URL
#   anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
#   service_role key → SUPABASE_SERVICE_ROLE_KEY

# 5. Lancer l'application
npm run dev --workspace @hanut/web
```

### Données de test

```bash
# Injecter les données de test dans la DB locale
npx supabase db reset  # reapplique toutes les migrations
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

Ou depuis le SQL Editor Supabase local : http://localhost:54323 → SQL Editor → coller le contenu de `supabase/seed.sql`.

### Crédentiels locaux par défaut (après `supabase start`)

| Paramètre | Valeur |
|---|---|
| API URL | `http://localhost:54321` |
| Studio | `http://localhost:54323` |
| DB port | `54322` |
| Email local (Inbucket) | `http://localhost:54324` |
| User postgres | `postgres` / `postgres` |

---

## Workflow — Nouvelle fonctionnalité

```
Local (dev) → staging (validation) → prod (release)
```

### 1. Développement local

```bash
git checkout -b feature/ma-fonctionnalite
# ... développer ...
npm run test --workspace @hanut/web          # tests unitaires
npm run test:integration --workspace @hanut/web  # tests RPC/RLS (nécessite supabase start)
npm run type-check --workspace @hanut/web
git push -u origin feature/ma-fonctionnalite
```

### 2. Validation en staging

```bash
# Merger la feature dans staging (pas de PR nécessaire pour le staging)
git checkout staging
git merge feature/ma-fonctionnalite
git push origin staging
# → Vercel déploie automatiquement sur hanut-staging.vercel.app
```

Si la migration est nécessaire sur staging :
```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST-STAGING]:5432/postgres"
```

### 3. Mise en production

```bash
# Ouvrir une PR : feature/ma-fonctionnalite → main
# Review → Merge → Vercel déploie automatiquement sur hanut.tn
```

Si la migration est nécessaire sur la prod :
```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST-PROD]:5432/postgres"
```

> Toujours appliquer les migrations **après** le déploiement du code si les migrations sont
> rétrocompatibles (ajout de colonnes, nouvelles fonctions). Pour les breaking changes, utiliser
> un déploiement en deux temps (migration → code) ou une maintenance courte.

---

## Note — Espace parasite dans .env.local

Le fichier `.env.local` contient `SUPABASE_SERVICE_ROLE_KEY =` avec un espace avant `=`. Corriger :

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← sans espace
```
