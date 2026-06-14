# Déploiement Hanut

## Variables d'environnement obligatoires

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...
NEXT_PUBLIC_APP_URL=https://hanut.tn
NEXT_PUBLIC_WHATSAPP_NUMBER=21600000000
HANUT_ADMIN_EMAILS=admin@hanut.tn
```

Variables optionnelles (recommandées en production) :

```env
SENTRY_AUTH_TOKEN=          # upload source maps à chaque build
SENTRY_DSN=                 # monitoring erreurs runtime
```

---

## ⚠️ Étapes manuelles CRITIQUES après chaque déploiement initial

### 1. Activer le hook JWT Supabase (OBLIGATOIRE)

**Impact si absent : 3 requêtes DB par requête HTTP protégée → effondrement à 200+ vendeurs actifs simultanés.**

Le hook `set_seller_jwt_claims` enrichit chaque JWT avec `seller_id`, `role` et `subscription_end`.
Sans ce hook, le middleware lit ces données depuis la DB à chaque requête.

**Procédure :**

1. Ouvrir le [Dashboard Supabase](https://app.supabase.com) → votre projet
2. Aller dans **Authentication → Hooks**
3. Cliquer sur **"Custom Access Token Hook"**
4. Renseigner :
   - **Schema** : `public`
   - **Function** : `set_seller_jwt_claims`
5. **Sauvegarder**
6. Se déconnecter / reconnecter depuis l'app pour forcer un nouveau JWT

**Vérification :** En développement, si le hook n'est pas actif, la console affiche :
```
[Hanut] Hook JWT Supabase non activé — 3 requêtes DB par requête HTTP.
```

---

### 2. Appliquer les migrations Supabase

```bash
npx supabase db push
# ou en local :
npx supabase db reset
```

Vérifier qu'aucune erreur n'apparaît. Les migrations sont idempotentes.

---

### 3. Vérifier la CSP en production

Ouvrir la console navigateur sur `/dashboard` → onglet **Console** et **Network**.

Aucune erreur `Content-Security-Policy` ne doit apparaître.

La CSP est générée par le middleware avec un nonce par requête (`script-src 'nonce-...' 'strict-dynamic'`).
Le Root Layout lit les headers, donc les pages sont rendues dynamiquement afin
que chaque réponse HTML reçoive le nonce correspondant. Turnstile récupère ce
nonce via `CspNonceProvider`.
Si une erreur CSP apparaît après une mise à jour, vérifier le fichier `apps/web/middleware.ts`.

---

### 4. Configurer Cloudflare Turnstile

1. Créer un site sur [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Copier la **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
3. Copier la **Secret Key** → `TURNSTILE_SECRET_KEY`
4. Tester la création d'une commande publique via `/order/[slug]`

---

### 5. Configurer les redirections Auth Supabase

Dans **Authentication → URL Configuration** :

1. Définir **Site URL** sur la même URL canonique que `NEXT_PUBLIC_APP_URL`.
2. Ajouter la Redirect URL :
   `https://votre-domaine/**`
3. Si les previews Vercel doivent aussi recevoir des emails, ajouter uniquement
   le wildcard du projet Vercel que vous contrôlez, par exemple
   `https://*-votre-equipe.vercel.app/**`.

Dans **Authentication → Email Templates**, utiliser des liens `TokenHash`.
Le simple `{{ .ConfirmationURL }}` n'est pas compatible avec les invitations
SSR, car l'invitation est créée sur un autre appareil que celui de l'invité.

Modèle **Invite user** :

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite">
  Accepter l'invitation
</a>
```

Modèle **Reset password** :

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">
  Réinitialiser mon mot de passe
</a>
```

Modèle **Confirm signup** :

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">
  Confirmer mon inscription
</a>
```

Destinations attendues :

- mot de passe oublié → callback sécurisé, puis `/reset-password`
- invitation équipe → callback sécurisé, puis `/accept-invitation`
- confirmation d'inscription → `/dashboard`

Après toute modification de ces URLs, générer un nouvel email : un lien déjà
envoyé conserve toujours son ancienne destination.

---

## Checklist de déploiement production

- [ ] Variables d'environnement toutes renseignées
- [ ] Hook JWT activé dans Supabase (voir étape 1)
- [ ] Migrations appliquées sans erreur
- [ ] Test création commande publique (Turnstile fonctionnel)
- [ ] Redirections Auth Supabase configurées et testées
- [ ] Console navigateur sans erreur CSP
- [ ] Sentry reçoit les events (tester avec une erreur intentionnelle)
- [ ] HSTS actif sur toutes les pages (`VERCEL_ENV=production` injecté par Vercel)
