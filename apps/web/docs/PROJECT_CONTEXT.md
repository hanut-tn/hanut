# HANUT — Document de contexte complet pour Claude Code

> Document factuel généré par lecture intégrale du code (migrations SQL, lib, routes API, server actions, pages, types). Chaque affirmation technique cite son fichier source. Date de génération : voir `git log`. La date « aujourd'hui » du projet est le 2026-06-16 (mémoire utilisateur).

---

## 1. Vue d'ensemble du produit

**Hanut** est un outil SaaS de gestion de commandes pour les **vendeurs tunisiens** qui vendent via WhatsApp et Instagram (commerce social, sans site e-commerce). Problème résolu : centraliser commandes, stock, livraisons COD (cash on delivery) et clients dans un seul tableau de bord, en remplacement des carnets papier et fils WhatsApp éparpillés (`apps/web/app/page.tsx`, métadonnées + sections marketing).

Marché cible : Tunisie. Interface 100 % en français (`fr-TN`). Téléphones tunisiens (regex `^[24579][0-9]{7}$`, `lib/constants.ts`), 24 gouvernorats tunisiens (`TUNISIAN_GOVERNORATES`), montants en dinars `DT` (`formatDT` dans `lib/utils.ts`).

**Modèle business** (`app/(marketing)/pricing/page.tsx`, `app/billing/page.tsx`, `lib/constants.ts` PLAN_LIMITS) :
- 3 plans : **Starter** (39 DT/mois), **Pro** (79 DT/mois), **Business** (prix non fixé, marqué « Bientôt disponible » / coming soon).
- **Trial** : toute inscription active automatiquement le plan **Pro pendant 14 jours**, sans carte bancaire (`set_demo_trial` RPC, migration `20260610_add_demo_trial.sql`).
- Paiement **hors plateforme** : par virement bancaire / mobile money (eDinar, Paymee) / en main propre, activé manuellement sous 24 h via WhatsApp. Aucune intégration de paiement en ligne dans le code.

**Entités métier principales et relations** :
- `sellers` (boutique = compte propriétaire, 1 par utilisateur Auth) → possède `products`, `customers`, `orders`, `team_members`.
- `orders` → appartient à 1 `customer`, référence 1 `product` principal (legacy) + N `order_items` (multi-produits récent), peut avoir N `deliveries`, un historique `order_status_history`, des `customer_addresses`.
- `deliveries` → liée à 1 `order`, type `self` ou `carrier`, gère le COD et son reversement (`cod_reversals`).

**État actuel** : Bêta privée (« Bêta privée » répété dans le marketing). Multi-produits par commande introduit récemment (`order_items`, migration `20260717`). Adresses structurées tunisiennes introduites récemment (`20260716`).

---

## 2. Stack technique exacte

| Couche | Technologie | Version (package.json) |
|---|---|---|
| Monorepo | Turborepo | `turbo ^2.0.0` (racine) |
| Package manager | npm | `npm@11.6.2` |
| Runtime | Node | `>=18` |
| Framework | Next.js (App Router) | `next ^15.3.0` |
| UI | React | `react ^18.3.0`, `react-dom ^18.3.0` |
| Langage | TypeScript | `^5.4.0` |
| Styles | Tailwind CSS | `tailwindcss ^3.4.3` (+ `autoprefixer ^10.4.19`, `postcss ^8.4.38`) |
| Icônes | lucide-react | `^1.17.0` |
| Validation | Zod | `zod ^4.4.3` |
| Backend / DB | Supabase (`@supabase/supabase-js`) | `^2.43.0` |
| Auth SSR | `@supabase/ssr` | `^0.5.0` |
| Monitoring | Sentry | `@sentry/nextjs ^10.56.0` |
| Tests | Vitest | `vitest ^4.1.8` |
| Lint | ESLint | `^9.39.4` + `eslint-config-next ^15.5.18` |

Base de données : **PostgreSQL via Supabase**, RLS activé, RPCs PL/pgSQL. `next.config.ts` enveloppe la config avec `withSentryConfig` (org `hanut`, project `javascript-nextjs`).

---

## 3. Structure du monorepo

```
/                              Racine workspace (npm workspaces: apps/*, packages/*)
├── turbo.json                 Pipeline turbo (build, dev, lint, test, type-check)
├── apps/web/                  Application Next.js 15 (App Router)
│   ├── middleware.ts          CSP nonce + auth gate + démo expirée → /billing
│   ├── next.config.ts         Headers sécurité + Sentry + images Supabase
│   ├── app/
│   │   ├── (auth)/            Pages login / register
│   │   ├── (dashboard)/       Espace connecté (orders, catalog, customers, deliveries, analytics, team, settings, dashboard, admin) + layout
│   │   ├── (marketing)/       Pages publiques marketing (pricing, features, about, contact, privacy, legal, roadmap, mobile, carriers)
│   │   ├── api/               Routes API (REST) — voir §13
│   │   ├── order/[slug]/      Page publique de commande (lien boutique)
│   │   ├── track/[orderId]/   Page publique de suivi commande
│   │   ├── billing/           Page choix de plan (démo expirée)
│   │   └── page.tsx           Landing page
│   ├── components/            Composants React (orders/, customers/, catalog/, deliveries/, dashboard/, ui/, analytics/, team/, track/, order/, marketing/, providers/)
│   ├── lib/                   Logique partagée (supabase clients, get-context, rate-limit, csrf, turnstile, activity, constants, address, order-otp, ...)
│   ├── docs/                  DEPLOYMENT.md, TEAM_ROLES.md, WORKFLOWS.md, PROJECT_CONTEXT.md (ce fichier)
│   └── __tests__/             Tests Vitest (+ sous-dossiers e2e/, integration/)
├── packages/types/src/        Types TS partagés (@hanut/types) : order, product, customer, delivery, seller, address, index
└── supabase/migrations/       Migrations SQL chronologiques (20260101 → 20260717)
```

Alias TS (`apps/web/tsconfig.json`) : `@/*` → racine app ; `@hanut/types` → `packages/types/src/index.ts`. `transpilePackages: ['@hanut/types']`.

---

## 4. Modèle de données complet

> Source : `supabase/migrations/`. Le schéma de base est `20260101_base_tables.sql`, enrichi par les migrations suivantes. RLS activé sur toutes les tables applicatives. Privilèges SQL restaurés par `20260626_restore_api_role_privileges.sql` (`service_role` = ALL, `authenticated` = SELECT/INSERT/UPDATE/DELETE, RLS reste la couche d'autorisation).

### sellers
| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | = `auth.users.id` (le owner) |
| email | TEXT UNIQUE | non | | |
| name | TEXT | non | | Nom de la boutique |
| phone | TEXT | oui | | |
| plan | TEXT | non | `'pro'` (DEFAULT changé par `20260610`) | starter / pro / business |
| subscription_end | TIMESTAMPTZ | oui | | Fin de démo/abonnement ; NULL = pas de limite |
| slug | TEXT UNIQUE (partiel WHERE slug IS NOT NULL) | oui | | Lien public `/order/[slug]` |
| onboarding_completed | BOOLEAN | non | false | |
| onboarding_steps | JSONB | non | `{"product_added":false,"link_copied":false,"first_order":false}` | |
| onboarding_dismissed_until | TIMESTAMPTZ | oui | NULL | |
| created_at | TIMESTAMPTZ | | now() | |

RLS : SELECT owner ou membre actif (`get_team_role IN admin/operator/readonly`) ; INSERT/UPDATE owner uniquement (`id = auth.uid()`) ; pas de DELETE (passe par `delete_seller_account`). Trigger `trg_handle_plan_team_access` sur changement de `plan` (suspension/restauration équipe).

### products
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| seller_id | UUID FK→sellers (CASCADE) | non | | |
| name | TEXT | non | | |
| price | DECIMAL(10,2) | non | | CHECK `>= 0` |
| cost | DECIMAL(10,2) | oui | | CHECK NULL ou `>= 0` ; coût d'achat (WAC sur restock) |
| stock | INTEGER | non | 0 | CHECK `>= 0` ; synchronisé sur SUM(variants.qty) par trigger |
| low_stock_alert | INTEGER | non | 3 | CHECK `>= 0` |
| variants | JSONB | non | `[]` | `[{size?,color?,qty}]` |
| image_url | TEXT | oui | | Bucket `product-images` |
| description | TEXT | oui | NULL | (`20260602_add_products_description.sql`) |
| created_at | TIMESTAMPTZ | | now() | |

RLS : team policies `products_team_read/write/update/delete` (read = `seller_id = get_seller_id()`, write/update = `can_write_seller`, delete = `is_seller_admin`). Trigger `trg_sync_stock_from_variants` (BEFORE UPDATE OF variants → stock = SUM(GREATEST(0,qty))).

### customers
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| seller_id | UUID FK→sellers | non | | |
| name | TEXT | non | | |
| phone | TEXT | non | | |
| email | TEXT | oui | | (`20260711`) |
| address | TEXT (legacy) | oui | | Adresse libre v1 |
| city | TEXT (legacy) | oui | | |
| customer_governorate | TEXT | oui | | Adresse structurée v2 (`20260716`) |
| customer_city | TEXT | oui | | Ville / délégation |
| customer_delegation | TEXT | oui | | |
| customer_address | TEXT | oui | | Adresse détaillée |
| customer_landmark | TEXT | oui | | Repère livreur |
| customer_postal_code | TEXT | oui | | CHECK 4 chiffres |
| delivery_notes | TEXT | oui | | |
| address_version | SMALLINT | non | 1 | 1 = legacy, 2 = structuré |
| order_count | INTEGER | non | 0 | maintenu par triggers |
| total_spent | NUMERIC | non | 0 | dénormalisé (`20260618`) |
| last_order_at | TIMESTAMPTZ | oui | | dénormalisé |
| tags | TEXT[] | non | `{}` | CRM (plan Pro) — peut être JSONB sur projets existants |
| notes | TEXT | oui | | CRM (plan Pro) |
| created_at | TIMESTAMPTZ | | now() | |

CHECK `customers_structured_address_required` (si address_version >= 2 alors gouvernorat+city+address+landmark non vides), `customers_postal_code_format` (4 chiffres). RLS team. Triggers : `trg_update_customer_order_count` (order_count), `trg_update_customer_stats` (total_spent/last_order_at). Vue `customers_with_stats` (security_invoker).

### orders
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| seller_id | UUID FK→sellers | non | | |
| customer_id | UUID FK→customers | non | | |
| product_id | UUID FK→products | non | | Produit « principal » (legacy ; le détail multi est dans order_items) |
| variant | TEXT | oui | | |
| quantity | INTEGER | non | 1 | CHECK `> 0` |
| cod_amount | DECIMAL(10,2) | non | | CHECK `>= 0` ; total à encaisser |
| unit_cost | NUMERIC | non | 0 | CHECK `>= 0` ; snapshot du coût (`20260610`) |
| status | TEXT | non | `'new'` | CHECK ∈ pending/new/confirmed/shipped/delivered/returned/cancelled |
| notes | TEXT | oui | | |
| customer_email | TEXT | oui | | (`20260711`) |
| customer_address / customer_city | TEXT | oui | | snapshot adresse legacy (`20260715`) |
| customer_governorate / customer_delegation / customer_landmark / customer_postal_code / delivery_notes | TEXT | oui | | snapshot adresse structurée (`20260716`) |
| address_version | SMALLINT | non | 1 | |
| tracking_token | TEXT UNIQUE | oui | | `replace(gen_random_uuid()::text,'-','')` ; URL publique de suivi |
| deleted_at | TIMESTAMPTZ | oui | NULL | soft-delete / corbeille |
| archived_by | UUID FK→auth.users | oui | NULL | |
| created_at / updated_at | TIMESTAMPTZ | | now() | trigger `orders_updated_at` |

CHECK adresse identiques à customers. RLS team (read seller_id, insert/update can_write, delete is_seller_admin). Index nombreux (voir §plus bas). Triggers maintiennent compteurs customers.

### order_items (`20260717`)
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| order_id | UUID FK→orders (CASCADE) | non | | |
| seller_id | UUID FK→sellers (CASCADE) | non | | |
| product_id | UUID FK→products | non | | |
| variant | TEXT | oui | | |
| quantity | INTEGER | non | | CHECK `>= 1` |
| unit_price | NUMERIC(10,2) | non | | |
| unit_cost | NUMERIC(10,2) | non | 0 | |
| created_at | TIMESTAMPTZ | non | now() | |

RLS : SELECT si `seller_id = auth.uid()` OU l'order parent appartient au seller. Index sur order_id, seller_id. Backfill depuis orders existants (1 item/order).

### deliveries
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| order_id | UUID FK→orders (CASCADE) | non | | |
| delivery_type | TEXT | non | `'carrier'` | CHECK self / carrier (`20260701`) |
| carrier | TEXT | oui (NOT NULL retiré) | | CHECK selon type (`20260706` corrige NULL) |
| tracking_number | TEXT | oui | | |
| carrier_status | TEXT | oui | | |
| fee | DECIMAL(10,2) | oui | | CHECK NULL ou `>= 0` |
| vendor_note | TEXT | oui | | message client (self) ≤ 1000 car |
| cod_collected | BOOLEAN | non | false | |
| cod_reversed | BOOLEAN | non | false | |
| cod_reversed_at | TIMESTAMPTZ | oui | | (`20260623`) |
| cod_reversed_amount | NUMERIC | non | 0 | CHECK `>= 0` |
| cod_reversed_by | UUID FK→auth.users | oui | | |
| created_at | TIMESTAMPTZ | | now() | |
| delivered_at | TIMESTAMPTZ | oui | | |

CHECK `deliveries_carrier_check` : self → carrier/tracking/fee NULL ; carrier → carrier ∈ 5 transporteurs ET vendor_note NULL. Index UNIQUE partiel `idx_unique_active_delivery_per_order` (1 livraison active = cod_collected=false par commande). RLS via jointure orders.

### team_members
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| seller_id | UUID FK→sellers (CASCADE) | non | | |
| user_id | UUID FK→auth.users (CASCADE) | oui | | NULL tant que l'invité n'a pas accepté |
| role | TEXT | non | | CHECK admin / operator / readonly |
| email | TEXT | non | | |
| name | TEXT | oui | | |
| status | TEXT | non | `'pending'` | CHECK pending / active / suspended (`20260708`) |
| status_before_suspension | TEXT | oui | | (downgrade) |
| invited_at / joined_at | TIMESTAMPTZ | | now() / NULL | |
| expires_at | TIMESTAMPTZ | oui | | invitation 7 jours (`20260604`) |
| invitation_token | TEXT UNIQUE (partiel) | oui | | (`20260611`) |

UNIQUE (seller_id, user_id), UNIQUE (seller_id, email). RLS `team_select/insert/update/delete`.

### activity_logs
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | non | gen_random_uuid() | |
| seller_id | UUID FK→sellers | non | | |
| user_id | UUID FK→auth.users (SET NULL) | oui | | |
| user_name | TEXT | non | `''` | |
| action_type | TEXT | non | | CHECK longueur > 0 |
| entity_type / entity_id | TEXT | oui | | |
| description | TEXT | non | | CHECK longueur > 0 ; téléphones strippés par `sanitizeDescription` |
| metadata | JSONB | non | `{}` | |
| created_at | TIMESTAMPTZ | non | now() | |

RLS : read = seller_id, insert = can_write_seller. Index seller+created, seller+user, seller+action, seller+entity.

### stock_movements
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | | gen_random_uuid() | |
| seller_id / product_id | UUID FK (CASCADE) | non | | |
| variant_name | TEXT | oui | | |
| quantity_before / quantity_after | INTEGER | oui | | |
| delta | INTEGER | non | | |
| movement_type | TEXT | non | | CHECK order / order_cancel / restock / correction / return / loss |
| unit_cost | DECIMAL(10,2) | oui | | |
| supplier / notes | TEXT | oui | | |
| order_id | UUID FK→orders (SET NULL) | oui | | |
| created_by | UUID FK→auth.users | oui | | |
| created_by_name | TEXT | non | `''` | |
| created_at | TIMESTAMPTZ | non | now() | |

RLS : read seller_id, insert can_write. (Plan Pro pour l'historique.)

### order_status_history
| Colonne | Type | Null | Défaut |
|---|---|---|---|
| id | UUID PK | | gen_random_uuid() |
| order_id | UUID FK→orders (CASCADE) | non | |
| status | TEXT | non | |
| changed_at | TIMESTAMPTZ | non | now() |
| changed_by | UUID FK→auth.users | oui | |

RLS : read/insert via jointure orders. Suivi public lu via `service_role`.

### order_status_transitions (`20260622`)
| Colonne | Type | | |
|---|---|---|---|
| from_status | TEXT | PK partie 1 | |
| to_status | TEXT | PK partie 2 | |

Données : voir §6. RLS : SELECT pour authenticated (`USING true`).

### cod_reversals (`20260623`)
| Colonne | Type | Null | Défaut |
|---|---|---|---|
| id | UUID PK | | gen_random_uuid() |
| delivery_id | UUID FK→deliveries (CASCADE) | non | (UNIQUE) |
| seller_id | UUID FK→sellers (CASCADE) | non | |
| amount | NUMERIC | non | CHECK `> 0` |
| notes | TEXT | oui | |
| reversed_by | UUID FK→auth.users (SET NULL) | oui | |
| reversed_at | TIMESTAMPTZ | non | now() |

RLS : SELECT seller_id. INSERT via RPC `mark_delivery_cod_reversed` uniquement.

### order_otps (`20260710` + `20260712`)
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | | gen_random_uuid() | |
| seller_id | UUID FK→sellers (CASCADE) | non | | |
| slug | TEXT | non | | |
| email | TEXT | non | | |
| code_hash | TEXT | non | | HMAC-SHA256 (clé = service_role key) |
| attempts | INTEGER | non | 0 | CHECK 0..5 |
| expires_at | TIMESTAMPTZ | non | | +5 min |
| verified | BOOLEAN | non | false | |
| created_at | TIMESTAMPTZ | non | now() | |

UNIQUE (seller_id, email). RLS : `USING (false)` — accès **service_role uniquement**. Trigger `trg_cleanup_expired_order_otps` (purge > 1 h sur INSERT).

### rate_limits (`20260603`)
| Colonne | Type | Null | Défaut |
|---|---|---|---|
| id | UUID PK | | gen_random_uuid() |
| identifier | TEXT | non | |
| endpoint | TEXT | non | |
| requests | INTEGER | non | 1 |
| window_start | TIMESTAMPTZ | non | NOW() |

UNIQUE (identifier, endpoint). RLS activé, aucune policy → service_role uniquement (via RPC `check_rate_limit`).

### waitlist / contact_messages (`20260601`)
- `waitlist` : id, email (UNIQUE, CHECK `@`), created_at. RLS SELECT service_role.
- `contact_messages` : id, name (CHECK non vide), email (CHECK `@`), message (CHECK non vide), created_at. RLS SELECT service_role.

### upgrade_requests (`20260608`)
| Colonne | Type | Null | Défaut |
|---|---|---|---|
| id | UUID PK | | gen_random_uuid() |
| seller_id | UUID FK→sellers (CASCADE) | oui | |
| current_plan / requested_plan | TEXT | non | |
| status | TEXT | | `'pending'` (CHECK pending/activated/cancelled) |
| whatsapp_opened_at | TIMESTAMPTZ | | NOW() |
| activated_at / notes | | oui | |
| created_at | TIMESTAMPTZ | | NOW() |

RLS : select/insert `seller_id = auth.uid()`.

### customer_addresses (`20260715` + `20260716`)
| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| id | UUID PK | | gen_random_uuid() | |
| seller_id / customer_id | UUID FK (CASCADE) | non | | |
| address / city | TEXT | oui | | legacy |
| address_normalized / city_normalized | TEXT | non | | clé de dédup |
| customer_governorate/_city/_delegation/_address/_landmark/_postal_code/delivery_notes | TEXT | oui | | structuré |
| address_version | SMALLINT | non | 1 | |
| use_count | INTEGER | non | 1 | CHECK `>= 0` |
| first_used_at / last_used_at | TIMESTAMPTZ | non | now() | |

UNIQUE (customer_id, address_normalized, city_normalized). CHECK not_empty + structured_required + postal_code_format. RLS team (read admin/operator/readonly, insert/update can_write, delete admin).

### restock_orders (`20260606`)
Réapprovisionnements planifiés : id, seller_id, product_id, status (planned/received/cancelled), variants_quantities JSONB, total_quantity (CHECK >0), unit_cost, supplier, expected_date, received_date, notes, created_by, created_at, updated_at. RLS team.

### Storage
Bucket `product-images` (public, 5 Mo max, jpeg/png/webp/gif). Policies : lecture publique ; upload/update/delete restreints au dossier `{seller_id}/` via `get_seller_id()` (`20260611_fix_storage_rls.sql`).

### Index notables
`idx_orders_seller_created` (WHERE deleted_at NULL), `idx_orders_seller_customer_created`, `idx_orders_seller_status`, `idx_orders_tracking_token`, `idx_orders_structured_location_created`, `idx_customers_seller_phone`, `idx_customers_cursor_{name,order_count,total_spent,last_order}`, `idx_deliveries_order_id`, `idx_unique_active_delivery_per_order`, `idx_activity_logs_{seller_created,user,entity}`, `idx_stock_movements_{product,seller}`, `idx_order_otps_{seller_email_unique,lookup}`, `idx_team_members_*`.

---

## 5. Fonctions RPC (toutes)

> Toutes sont `SET search_path = public` (sécurité). La plupart sont `SECURITY DEFINER` avec une garde interne : `is_service_role()` OU `can_write_seller()` / `get_team_role()`. Source : migrations.

### create_order_with_stock(...) — version finale 19 params (`20260717`, après `20260716`/`20260712`)
- Params : p_seller_id UUID, p_product_id UUID, p_quantity INT, p_customer_name, p_customer_phone, p_customer_address?, p_customer_city?, p_customer_id? UUID, p_variant?, p_cod_amount? NUMERIC, p_notes?, p_status TEXT='new', p_changed_by? UUID, p_customer_email?, p_customer_governorate?, p_customer_delegation?, p_customer_landmark?, p_customer_postal_code?, p_delivery_notes?.
- Retour : UUID (order_id). SECURITY DEFINER.
- Rôle : crée une commande mono-produit atomiquement — verrouille le seller (quota), valide variante/stock, upsert client, écrit historique adresse `customer_addresses`, décrémente stock, insère `order_items` (1), `order_status_history`, `stock_movements`. Crée aussi un `tracking_token`.
- Erreurs : UNAUTHORIZED, INVALID_STATUS_ON_CREATE (seuls 'pending'/'new'), SHOP_INACTIVE, LIMIT_REACHED (Starter ≥ 100/mois), INVALID_POSTAL_CODE, « Variante obligatoire/invalide/ambiguë », variant_insufficient_stock, « Stock insuffisant... », « Montant COD invalide », « Client/Produit/Vendeur introuvable ».
- Appelée par : `create_public_order_with_otp` (le flux dashboard utilise plutôt `create_order_with_items`). Note historique : la signature a évolué 12→13→14→19 params au fil des migrations (`20260601`…`20260716`), `20260610_consolidate_order_rpc.sql` a servi de source de vérité intermédiaire.

### create_order_with_items(...) (`20260717`)
- Params : p_seller_id, p_customer_name, p_customer_phone, p_customer_address?, p_customer_city?, p_customer_id?, p_notes?, p_status='new', p_changed_by?, p_customer_email?, p_customer_governorate?, p_customer_delegation?, p_customer_landmark?, p_customer_postal_code?, p_delivery_notes?, **p_cod_amount TEXT**?, **p_items JSONB**='[]'.
- Retour : UUID. SECURITY DEFINER.
- Rôle : crée une commande **multi-produits**. Valide chaque item (stock/variante), calcule le total si p_cod_amount NULL, upsert client + adresse, crée `orders` (product_id = 1er item), N `order_items`, décrémente stock par item, `stock_movements` par item, `order_status_history`.
- Erreurs : mêmes que ci-dessus + « Au moins un article est obligatoire ».
- Appelée par : `createOrder` server action (`app/(dashboard)/orders/actions.ts`), et `create_public_order_with_otp`.

### create_public_order_with_otp(...) — version finale 17 params (`20260717`)
- Params : p_slug, p_email, p_code_hash, p_product_id? UUID, p_quantity INT=1, p_customer_name?, p_customer_phone?, p_customer_address?, p_customer_city?, p_variant?, p_notes?, p_customer_governorate?, p_customer_delegation?, p_customer_landmark?, p_customer_postal_code?, p_delivery_notes?, p_items? JSONB.
- Retour : JSONB `{ok, order_id?, tracking_token?, seller_id?, error?, detail?}`. SECURITY DEFINER, **service_role only**.
- Rôle : vérifie l'OTP (slug+email+code_hash, expiration, ≤ 5 tentatives), puis appelle `create_order_with_items` en statut 'pending'. Marque l'OTP `verified` seulement si la commande réussit.
- Erreurs (champ `error`) : UNAUTHORIZED, SHOP_NOT_FOUND, OTP_NOT_FOUND, OTP_EXPIRED, OTP_TOO_MANY_ATTEMPTS, OTP_INCORRECT, ORDER_CREATION_FAILED (+ `detail`).
- Appelée par : `app/api/orders/verify-otp/route.ts`.

### update_order_status(p_seller_id, p_order_id, p_new_status, p_changed_by) (`20260709`)
- Retour VOID. SECURITY DEFINER. Garde `is_service_role()` ou `can_write_seller`.
- Vérifie la transition via `order_status_transitions`. **Refuse explicitement** `cancelled` → `USE_CANCEL_ORDER_RPC`. Erreurs : Non autorise, INVALID_STATUS, ORDER_NOT_FOUND, INVALID_TRANSITION:x->y.
- Appelée par : `updateOrderStatus`, `deleteDelivery` (rollback shipped→confirmed) dans actions.

### cancel_order_with_stock(p_seller_id, p_order_id, p_changed_by) (`20260709`)
- Retour VOID. Annule depuis pending/new/confirmed/**returned**, restaure le stock (`adjust_order_stock`), statut → cancelled. Erreurs : Non autorise, ORDER_NOT_FOUND, CANNOT_CANCEL_STATUS:x. Appelée par `cancelOrder`.

### cancel_pending_order_with_stock(p_seller_id, p_order_id, p_changed_by) (`20260621`)
- VOID. Annule uniquement les commandes 'pending', restaure stock, statut → cancelled. Appelée par `cancelPendingOrder`.

### soft_delete_order_with_stock(p_seller_id, p_order_id, p_archived_by) (`20260612`)
- VOID. Admin-only (`get_team_role = admin` ou service_role). Déplace en corbeille (`deleted_at`). Restaure stock seulement si pending/new/confirmed. Bloque shipped. Pour Starter : bloque delivered/returned/cancelled (`CANNOT_DELETE`). Appelée par `deleteOrder`.

### restore_trashed_order_with_stock(p_seller_id, p_order_id, p_restored_by) (`20260621`)
- VOID. Admin-only. Restaure depuis corbeille (< 30 jours), re-décrémente stock si actif. Appelée par `restoreOrder`.

### adjust_order_stock(p_seller_id, p_order_id, p_delta, p_movement_type, p_notes, p_changed_by) (`20260609`)
- INTEGER. **Helper interne** (EXECUTE révoqué à authenticated en `20260621`, service_role only). Ajuste stock global ou variante d'une commande + `stock_movements`.

### adjust_product_stock(p_seller_id, p_product_id, p_variant_name, p_delta, p_movement_type, p_unit_cost?, p_supplier?, p_notes?, p_changed_by?, p_changed_by_name?) (`20260614`, fix `20260628`)
- JSONB `{stock_before, stock_after, delta}`. Garde can_write. Types : restock/correction/return/loss/order_cancel. Rejette delta=0. Calcule WAC sur restock. Erreurs : INVALID_MOVEMENT_TYPE, INVALID_DELTA, PRODUCT_NOT_FOUND, VARIANT_NOT_FOUND/AMBIGUOUS, INSUFFICIENT_STOCK. Appelée par `adjustStock`.

### create_delivery_from_order(p_seller_id, p_user_id, p_order_id, p_delivery_type='carrier', p_carrier?, p_tracking_number?, p_fee?, p_vendor_note?) (`20260701`)
- UUID. Garde can_write. Exige order status='confirmed'. Crée la livraison, passe l'order à 'shipped' + historique. Erreurs : UNAUTHORIZED, INVALID_DELIVERY_TYPE/CARRIER/FEE, TRACKING_NUMBER_TOO_LONG, VENDOR_NOTE_TOO_LONG, order_not_shippable. Appelée par `createDelivery` / `createDeliveryFromOrder`.

### mark_delivery_cod_collected(p_seller_id, p_user_id, p_delivery_id) (`20260609`/`20260621`)
- UUID (order_id). Marque cod_collected=true, order → delivered + historique. Erreurs : UNAUTHORIZED, delivery_not_found, INVALID_TRANSITION. Appelée par `updateDelivery` (cod_collected).

### mark_self_delivery_complete(p_seller_id, p_user_id, p_delivery_id) (`20260701`)
- UUID. Variante self-delivery : encaisse COD, order → delivered. Jamais marqué « reversé ». Appelée par `markSelfDeliveryComplete`.

### mark_delivery_cod_reversed(p_delivery_id, p_seller_id, p_amount, p_notes?, p_reversed_by?) (`20260623`)
- UUID (reversal_id). Garde can_write. Exige cod_collected. Insère `cod_reversals`, marque cod_reversed. Erreurs : UNAUTHORIZED, DELIVERY_NOT_FOUND_OR_COD_NOT_COLLECTED, COD_ALREADY_REVERSED, INVALID_REVERSAL_AMOUNT. Appelée par `recordCodReversal`.

### get_analytics_summary(p_seller_id, p_start, p_end) (`20260612`)
- JSONB (total_revenue/fees/cost, order/shipped/delivered/returned/cancelled_count). Garde lecture (admin/operator/readonly). Fallback dashboard.

### get_dashboard_kpis(p_seller_id, p_start, p_end) (`20260704`)
- JSONB (mêmes champs, total_fees=0, sans jointure). KPI principal du dashboard. Appelée par `dashboard/page.tsx` (fallback vers get_analytics_summary).

### get_analytics_export(p_seller_id, p_start, p_end) (`20260625`)
- TABLE (day, order_count, revenue, costs, fees, profit, delivery_rate, cod_pending). Garde lecture. Erreurs INVALID_DATE_RANGE, DATE_RANGE_TOO_LARGE (>366j). Appelée par `app/api/analytics/export/route.ts`.

### get_customer_stats(p_customer_id, p_seller_id) (`20260613`, fix `20260614`)
- JSONB (total_spent, order_count, delivered/returned/cancelled_count, delivery_rate = livré/total*100, favorite_product, last_order_at). Garde lecture.

### get_cod_summary(p_seller_id) (`20260630`, maj `20260701`)
- TABLE (total_collected, total_reversed, pending_reversal_count/amount, total_fees, total_deliveries). **Admin-only**. Self-delivery exclu des reversals en attente.

### get_customers_cursor_page(p_seller_id, p_sort_by='name', p_limit=20, p_cursor_value?, p_cursor_id?, p_search?) (`20260707`, maj `20260716`)
- TABLE (colonnes customer + stats). Keyset pagination. Tris : name/total_spent/order_count/last_order. Garde lecture. Erreurs INVALID_SORT, UNAUTHORIZED. Appelée par `app/api/customers/cursor/route.ts`.

### search_orders(p_seller_id, p_search, p_customer_ids=[], p_limit=100) (`20260603`, maj `20260716`/`20260717`)
- TABLE (order + adresse + customer JSONB + product JSONB + **items JSONB**). SECURITY **INVOKER**. Recherche par préfixe d'UUID ou IDs clients. Appelée par `app/api/orders/route.ts` (GET search).

### check_rate_limit(p_identifier, p_endpoint, p_max_requests, p_window_seconds) (`20260603`)
- TABLE (allowed, remaining, reset_in). SECURITY DEFINER, **service_role only**. Fenêtre glissante sur `rate_limits`. Appelée par `lib/rate-limit.ts`.

### anonymize_customer(p_seller_id, p_customer_id) (`20260629`, itérations `20260702/03/13/16`)
- VOID. **Admin-only**. Voir §12.

### delete_seller_account(p_seller_id, p_user_id) (`20260608`, fix `20260628`)
- VOID. service_role only. Vérifie pas de COD pending (`cod_pending`), cascade delete (dynamique pour tables optionnelles), supprime seller. Erreurs seller_not_found, cod_pending. Appelée par `app/api/account/route.ts`.

### set_demo_trial(p_seller_id) (`20260610`)
- VOID. service_role. plan='pro', subscription_end = now()+14j (idempotent). Appelée par register route.

### set_seller_jwt_claims(event JSONB) (`20260616`)
- JSONB. Hook JWT (GRANT à `supabase_auth_admin`). Injecte claims seller_id, plan, subscription_end. **À activer manuellement** dans Supabase Dashboard (voir §10).

### Fonctions RLS / utilitaires
`get_seller_id()`, `get_team_role(p_seller_id)`, `can_write_seller(p_seller_id)`, `is_seller_admin(p_seller_id)`, `is_service_role()` (`20260627`), `variant_label(jsonb,bigint)`, `sum_variant_stock(jsonb)`, `sync_product_stock`, `refresh_customer_stats`, `cleanup_team_on_downgrade`, `restore_team_after_upgrade`, `cleanup_expired_order_otps`. Voir §10/§11.

---

## 6. Machine d'état des commandes

**Statuts** (`OrderStatus`, `packages/types/src/order.ts` + CHECK `orders_status_check`) : `pending`, `new`, `confirmed`, `shipped`, `delivered`, `returned`, `cancelled`.

**Transitions valides** — la source de vérité DB est la table `order_status_transitions` (`20260622` + `20260709` + `20260714`) ; le miroir TypeScript est `VALID_TRANSITIONS` dans `lib/order-transitions.ts`.

| from → to | Condition / sémantique |
|---|---|
| pending → new | Confirmation par le vendeur d'une commande publique (`confirmPendingOrder`) |
| pending → cancelled | Via RPC d'annulation (restaure stock) |
| new → confirmed | Validation |
| new → cancelled | Via RPC annulation |
| confirmed → shipped | Création d'une livraison (`create_delivery_from_order`) |
| confirmed → cancelled | Via RPC annulation |
| shipped → delivered | COD collecté (`mark_delivery_cod_collected` / self) |
| shipped → returned | Retour transporteur |
| shipped → confirmed | **Rollback système** : suppression d'une livraison non collectée (exclu de `getAvailableTransitions`) |
| returned → cancelled | Finalisation d'un retour (restaure stock, `20260709`) |

`delivered` et `cancelled` sont **terminaux**. Important : `update_order_status` **refuse** la transition vers `cancelled` (lève `USE_CANCEL_ORDER_RPC`) ; toute annulation passe par `cancel_order_with_stock` / `cancel_pending_order_with_stock` pour gérer le stock atomiquement.

Fichiers : `lib/order-transitions.ts` (`VALID_TRANSITIONS`, `isValidTransition`, `getAvailableTransitions(status, role)` — readonly = aucune, operator = pas de cancelled), `lib/constants.ts` (`ORDER_STATUSES`, `ORDER_STATUS_CONFIG`, `DELETABLE_STATUSES = pending/new/confirmed`), migrations `20260622_add_status_transitions.sql`, `20260709`, `20260714`.

---

## 7. Le flow livraison

Deux types (`DeliveryType`, `packages/types/src/delivery.ts`) :
- **carrier** : livraison via transporteur. Champs **obligatoires** : `carrier` (∈ 5 transporteurs). Optionnels : `tracking_number`, `fee`. `vendor_note` doit être NULL (contrainte DB).
- **self** : livraison par la boutique. `carrier`/`tracking_number`/`fee` doivent être NULL. Optionnel : `vendor_note` (message client ≤ 1000 car).

Contrainte DB : `deliveries_carrier_check` (`20260706_fix_carrier_constraint.sql`).

**Flow étape par étape** :
1. Commande en `confirmed`.
2. `createDelivery`/`createDeliveryFromOrder` (`deliveries/actions.ts`) → RPC `create_delivery_from_order` → insère livraison + order → `shipped` + historique. Une seule livraison active par commande (index unique).
3. **carrier** : `updateDelivery({cod_collected:true})` → RPC `mark_delivery_cod_collected` → order `delivered`. Puis reversement COD : `markCodReversed`/`updateDelivery({cod_reversed})` → RPC `mark_delivery_cod_reversed` → `cod_reversals`.
4. **self** : `markSelfDeliveryComplete` → RPC `mark_self_delivery_complete` → COD encaissé directement, order `delivered` (jamais « reversé »).
5. Suppression d'une livraison non collectée : si order `shipped`, rollback → `confirmed` (`deleteDelivery`).

**5 transporteurs supportés** (`CarrierName`, `lib/constants.ts` `CARRIER_NAMES`/`CARRIER_CONFIG`/`CARRIER_TRACKING_URLS`) : `intigo` (IntiGo), `navex` (Navex), `adex` (Adex), `aramex` (Aramex), `bestdelivery` (Best Delivery). URLs de tracking par transporteur dans `CARRIER_TRACKING_URLS`. Helper `getTrackingUrl(carrier, num)`. Intégrations API transporteurs **non implémentées** (env vars commentées). Adresses « prêtes transporteur » : `lib/carrier-addresses.ts` (export CSV / payload manuel générique).

---

## 8. Le flow OTP de vérification commande publique

**Pourquoi** : les commandes via le lien public `/order/[slug]` exigent une vérification email (OTP) avant création, pour limiter le spam/fraude. L'ancienne route directe `/api/orders/public` renvoie 410 `OTP_REQUIRED` (`app/api/orders/public/route.ts`).

**Flow** :
1. Client remplit le formulaire sur `/order/[slug]` (composant `order/OrderForm.tsx`).
2. **POST `/api/orders/send-otp`** : vérifie origine (CSRF), rate-limits (IP 3/10 min `send_otp_ip` ; destinataire 1/min `send_otp_recipient`), Turnstile, existence boutique active. Génère code 4 chiffres (`generateOrderOtp`), hash HMAC-SHA256 (`hashOrderOtp`, clé = `SUPABASE_SERVICE_ROLE_KEY`), upsert `order_otps` (expire +5 min). Envoie l'email via **Resend** (en dev sans clé : code loggé en console).
3. **POST `/api/orders/verify-otp`** : vérifie origine, rate-limits (IP 20/10 min ; destinataire 10/10 min), Turnstile, valide téléphone tunisien + adresse (`HanutAddressFieldsSchema`). Appelle RPC `create_public_order_with_otp` (service_role). Retourne `{order_id (8 car maj), tracking_token}`. Mappe les erreurs RPC en messages FR + statuts HTTP.

**Table** `order_otps` (§4) : seller_id, slug, email, code_hash, attempts (0..5), expires_at, verified, created_at. Accès service_role only.

**Provider email** : **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Statut : en production sans clé → 503 ; en dev → code en console.

**Limites** : code expire 5 min, max 5 tentatives (bloqué après), 1 envoi/min par destinataire, 3 envois/10 min par IP, purge auto > 1 h.

Helpers : `lib/order-otp.ts` (normalize, generate, hash, rate-limit identifier, escapeEmailHtml).

---

## 9. Le système de plans et restrictions

`PLAN_LIMITS` (`lib/constants.ts`) :

| Plan | Prix | Commandes/mois | Membres équipe | Export CSV | Analytics | Historique stock | CRM tags/notes | Top stats |
|---|---|---|---|---|---|---|---|---|
| starter | 39 DT | **100** | 0 | ✗ | 30 jours | ✗ | ✗ | ✗ |
| pro | 79 DT | Illimité | 3 | ✓ | 180 jours | ✓ | ✓ | ✓ |
| business | (non fixé, coming soon) | Illimité | Illimité | ✓ | 180 jours | ✓ | ✓ | ✓ |

⚠️ La limite Starter `ordersPerMonth = 100` est **dupliquée** dans la RPC `create_order_with_stock` / `create_order_with_items` (`IF v_monthly_orders >= 100`). À synchroniser en cas de changement (commentaire dans `constants.ts` et migration `20260620`). Test `plan-limits-sync.test.ts` vérifie cette cohérence.

**`assertActive()`** (`lib/assert-active.ts`) : vérifie `context.demoExpired` (calculé depuis `subscription_end` dans `get-context.ts`). Variantes : `requireActive` (server actions → `{error}`), `requireActiveResponse` (API → Response 403 code `SUBSCRIPTION_EXPIRED`). Appelé dans toutes les server actions (orders/catalog/deliveries/customers/settings) et routes team/analytics-export/onboarding. L'enforcement DB se fait aussi via `SHOP_INACTIVE` dans les RPC de création.

**Trial 14 jours** : `set_demo_trial` à l'inscription → plan Pro + `subscription_end = now()+14j`. Le middleware redirige vers `/billing` si expiré. La page `/billing` propose Starter/Pro via WhatsApp.

**Flow d'upgrade** : `POST /api/upgrade-requests` enregistre la demande, l'utilisateur est dirigé vers WhatsApp (`getUpgradeWhatsAppUrl`). Activation manuelle. Downgrade Pro→Starter suspend l'équipe (trigger `handle_plan_team_access` → `cleanup_team_on_downgrade`), réactivée à l'upgrade.

---

## 10. Authentification et autorisation

**Fonctions RLS Supabase** :
- `get_seller_id()` (SECURITY DEFINER) : retourne l'id seller (owner ou 1ère équipe active de l'utilisateur courant).
- `can_write_seller(p_seller_id)` : `is_service_role()` OU rôle ∈ admin/operator.
- `get_team_role(p_seller_id)` : 'admin' si service_role ou owner, sinon rôle de team_members actif.
- `is_seller_admin(p_seller_id)` : owner réel uniquement (`auth.uid() = seller.id`).
- `is_service_role()` (`20260627`) : détecte service_role via `auth.role()` / `request.jwt.claim(s)`.

**4 « rôles » d'accès** (en réalité 3 rôles d'équipe + le propriétaire) — voir `docs/TEAM_ROLES.md` :
- **Propriétaire** (`isSeller = true`, toujours `admin`) : seul à pouvoir supprimer le compte, modifier le profil boutique et le slug.
- **admin** : lecture + créer/modifier + supprimer + anonymiser + gérer l'équipe et les rôles.
- **operator** : lecture + créer/modifier + ajuster stock + créer livraisons. **Pas** de suppression ni gestion équipe (RLS DELETE = is_seller_admin ; `getAvailableTransitions` exclut cancelled pour operator).
- **readonly** : lecture seule.

`UserContext` (`lib/get-context.ts`) : `{userId, sellerId, role, isSeller, userName, plan, demoExpiresAt, demoExpired, daysLeft}`. `getUserContext()` est mis en cache par requête (`React.cache`). Un compte créé par `inviteUserByEmail` (métadonnée `invitation_token`) ne peut jamais devenir owner par accident.

**Hook JWT** `set_seller_jwt_claims` : injecte `seller_id`, `plan`, `subscription_end` dans le JWT. **À activer manuellement** (Supabase Dashboard → Authentication → Hooks → Custom Access Token). **Impact si non activé** : le middleware fait jusqu'à 3 requêtes DB par requête HTTP protégée (fallback) — avertissement console en dev. Voir `docs/DEPLOYMENT.md` (étape 1, critique).

**Flow d'inscription** (`app/api/auth/register/route.ts`) :
1. Rate limit IP (5/60 min), validation Zod, Turnstile.
2. `supabase.auth.signUp` (anon client) avec `emailRedirectTo` vers `/api/auth/callback?next=/dashboard`.
3. Génère un slug unique (translittération arabe→latin, fallback `boutique-{ts}`), insère `sellers` (jusqu'à 10 tentatives sur collision `23505`).
4. `set_demo_trial` (plan Pro 14 j) — si échec, rollback complet (delete seller + auth user).
5. Callback `/api/auth/callback` : `verifyOtp` (token_hash) ou `exchangeCodeForSession` (code), redirige vers `next` (validé localhost-safe) ou `/dashboard`.

Le `(dashboard)/layout.tsx` active les invitations en attente (par `invitation_token` puis email) et déconnecte tout utilisateur Auth sans seller ni équipe (`/login?access_revoked=1`).

---

## 11. Sécurité — état actuel

**CSP** (`middleware.ts`) : générée par requête avec **nonce 128 bits** + `strict-dynamic`. `script-src 'self' 'nonce-…' 'strict-dynamic' [+ 'unsafe-eval' en dev] challenges.cloudflare.com` ; `style-src 'self' 'unsafe-inline' fonts.googleapis.com` ; `img-src` Supabase + data/blob ; `connect-src` Supabase + Cloudflare + Sentry ; `frame-src challenges.cloudflare.com` ; `object-src 'none'` ; `report-uri /api/csp-report`. Headers additionnels (`next.config.ts`) : X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS (production uniquement).

**Rate limiting** : table `rate_limits` + RPC `check_rate_limit` (fenêtre glissante, service_role). Wrapper `lib/rate-limit.ts` (`checkRateLimit`, `getClientIp` — préfère `x-vercel-forwarded-for` sur Vercel). Appliqué : register (5/60), team_invite (5/60), contact (5/60), waitlist (3/60), track (30/60), send_otp (IP 3/10 + dest 1/1), verify_otp (IP 20/10 + dest 10/10).

**CSRF** : `lib/csrf.ts` `checkOrigin()` valide Origin/Referer contre `NEXT_PUBLIC_APP_URL`/Vercel/localhost. En production sans `NEXT_PUBLIC_APP_URL` → refus. Appliqué sur send-otp, verify-otp, team POST/PATCH/DELETE, account DELETE, upgrade-requests, onboarding PATCH.

**Turnstile** (Cloudflare) : `lib/turnstile.ts` `verifyTurnstileToken`. En dev sans clé → passe ; en production sans clé → bloque. Utilisé : register, contact, waitlist, send-otp, verify-otp. Composant `ui/TurnstileWidget.tsx` + `providers/CspNonceProvider`.

**RLS** : activé sur toutes les tables applicatives ; policies team partout ; `order_otps`/`rate_limits` = service_role only. Privilèges SQL restaurés (`20260626`).

**Vulnérabilités connues / points d'attention** :
- Hook JWT non activé par défaut → coût DB (perf, pas sécurité) — documenté.
- Email OTP : sans `RESEND_API_KEY` en prod, l'envoi est bloqué (503) mais en dev le code est loggé en clair.
- `sanitizeDescription` (`lib/activity.ts`) strippe les numéros tunisiens des logs (défense en profondeur).
- Aucune mention de vulnérabilité ouverte explicite dans le code — à confirmer avec le fondateur.

---

## 12. RGPD / Conformité

**`anonymize_customer(p_seller_id, p_customer_id)`** (`20260629`, version finale `20260716`) — **admin-only** :
- customers : name='Client anonymisé', phone='00000000', email/address/city/customer_* (tous les champs adresse structurée)/notes = NULL, address_version=1, tags=[] (gère TEXT[] ou JSONB).
- supprime toutes les `customer_addresses` du client.
- orders : customer_email/customer_address/customer_city/customer_governorate/customer_delegation/customer_landmark/customer_postal_code/delivery_notes = NULL, address_version=1.
- activity_logs : description='Données client anonymisées', metadata='{}' pour les entrées entity_type='customer'.
- Le client reste en base (intégrité référentielle des commandes). Irréversible.

Exposé via server action `anonymizeCustomer` (`customers/actions.ts`) avec gestion d'erreurs (schema cache, type tags mismatch, type entity mismatch → messages + Sentry). Composant `customers/AnonymizeCustomerButton.tsx`.

**Loi référencée** : « droit à l'effacement, loi organique n° 2004-63 » (INPDP — protection des données personnelles tunisienne) (commentaire migration `20260629`).

**Ce qui reste à faire** : pas de purge automatique de la corbeille après 30 jours (suppression définitive = action admin explicite ; `docs/WORKFLOWS.md`). Pas de registre de consentement explicite. À confirmer avec le fondateur.

---

## 13. Carte complète des routes

> Public/Auth déterminé par `PUBLIC_PATHS` du middleware. Toutes les routes hors public exigent une session ; démo expirée → `/billing`.

### Pages
| Route | Type | Accès | Rôle | Fichier |
|---|---|---|---|---|
| `/` | Landing | Public (redirige connecté → /dashboard) | — | `app/page.tsx` |
| `/login`, `/register` | Auth | Public | — | `app/(auth)/login`, `register` |
| `/features` `/pricing` `/about` `/carriers` `/mobile` `/roadmap` `/contact` `/privacy` `/legal` | Marketing | Public | — | `app/(marketing)/*` |
| `/order/[slug]` | Commande publique | Public | — | `app/order/[slug]/page.tsx` |
| `/track/[orderId]` | Suivi public | Public | — | `app/track/[orderId]/page.tsx` |
| `/billing` | Plans | Auth (démo expirée) | tous | `app/billing/page.tsx` |
| `/dashboard` | Tableau de bord | Auth | tous (vues operator/readonly) | `app/(dashboard)/dashboard/page.tsx` |
| `/orders`, `/orders/[id]`, `/orders/new` | Commandes | Auth | lecture tous, écriture admin/operator | `app/(dashboard)/orders/*` |
| `/catalog`, `/catalog/[id]` | Produits/stock | Auth | idem | `app/(dashboard)/catalog/*` |
| `/customers`, `/customers/[id]` | Clients | Auth | idem | `app/(dashboard)/customers/*` |
| `/deliveries` | Livraisons COD | Auth | idem | `app/(dashboard)/deliveries/page.tsx` |
| `/analytics` | Analytics | Auth | tous | `app/(dashboard)/analytics/page.tsx` |
| `/team` | Équipe + journal | Auth (plan Pro) | admin pour écrire | `app/(dashboard)/team/page.tsx` |
| `/settings` | Paramètres | Auth | owner pour profil/slug | `app/(dashboard)/settings/page.tsx` |
| `/admin` | Admin plateforme | Auth (HANUT_ADMIN_EMAILS) | email whitelist | `app/(dashboard)/admin/page.tsx` |

### API (`app/api/*/route.ts`)
| Route | Méthode | Public/Auth | Notes |
|---|---|---|---|
| `/api/auth/register` | POST | Public | rate-limit + Turnstile |
| `/api/auth/callback` | GET | Public | verifyOtp / exchangeCode |
| `/api/orders` | GET | Auth | recherche (`search_orders`) |
| `/api/orders/list` | GET | Auth | pagination offset |
| `/api/orders/cursor` | GET | Auth | keyset pagination |
| `/api/orders/[id]` | GET | Auth | détail |
| `/api/orders/pending-count` | GET | Auth | badge |
| `/api/orders/public` | POST | Public | **410** (legacy, OTP requis) |
| `/api/orders/send-otp` | POST | Public | CSRF + RL + Turnstile + Resend |
| `/api/orders/verify-otp` | POST | Public | crée la commande publique |
| `/api/track/[orderId]` | GET | Public | suivi par tracking_token |
| `/api/customers` `/customers/list` `/customers/cursor` `/customers/[id]` | GET | Auth | listes + détail/stats |
| `/api/deliveries/bulk` | POST | Auth | actions groupées |
| `/api/deliveries/pending-cod-count` | GET | Auth | badge |
| `/api/team` | GET/POST | Auth (Pro) | liste / invitation |
| `/api/team/[memberId]` | PATCH/DELETE | Auth (admin, Pro) | rôle / retrait |
| `/api/team/[memberId]/resend` | POST | Auth | renvoi invitation |
| `/api/account` | DELETE | Auth (owner) | suppression compte |
| `/api/upgrade-requests` | GET/POST | Auth (owner) | demandes upgrade |
| `/api/onboarding` | PATCH | Auth (owner) | étapes onboarding |
| `/api/analytics/export` | GET | Auth (Pro) | CSV |
| `/api/activity` | GET | Auth | journal d'activité |
| `/api/contact` | POST | Public | RL + Turnstile |
| `/api/waitlist` | POST | Public | RL + Turnstile |
| `/api/csp-report` | POST | Public | rapports CSP → Sentry |

Server actions (`'use server'`) — `app/(dashboard)/{orders,catalog,deliveries,customers,settings}/actions.ts` + `catalog/restock-actions.ts`. Voir §5/§15.

---

## 14. Composants UI clés

| Composant | Fichier | Rôle | Props clés |
|---|---|---|---|
| Sidebar | `components/dashboard/Sidebar.tsx` | Nav desktop | role, sellerName, plan, daysLeft |
| TopBar | `components/dashboard/TopBar.tsx` | Barre haute | sellerName, role, isSeller |
| BottomNav / MobileSidebar | `components/dashboard/*` | Nav mobile | role, plan |
| DemoBanner | `components/dashboard/DemoBanner.tsx` | Bandeau démo ≤ 7 j | daysLeft |
| OnboardingChecklist | `components/dashboard/OnboardingChecklist.tsx` | Étapes onboarding | — |
| LowStockWidget | `components/dashboard/LowStockWidget.tsx` | Alerte stock bas | products, adjustStock, createRestockOrder |
| OperatorDashboard / ReadonlyDashboard | `components/dashboard/*` | Vues dashboard par rôle | — |
| CopyLinkButton | `components/dashboard/CopyLinkButton.tsx` | Copie lien public | slug |
| OrdersClient | `components/orders/OrdersClient.tsx` | Liste commandes + filtres | — |
| OrderDetail | `components/orders/OrderDetail.tsx` | Détail commande + actions statut | — |
| NewOrderForm | `components/orders/NewOrderForm.tsx` | Création commande (dashboard, multi-items) | — |
| OrderForm | `components/order/OrderForm.tsx` | Formulaire commande publique + OTP | slug, products |
| CustomersClient / CustomerDetail | `components/customers/*` | Liste / fiche client | — |
| AnonymizeCustomerButton | `components/customers/AnonymizeCustomerButton.tsx` | RGPD effacement | customerId |
| CatalogClient / ProductModal / ProductDetailClient | `components/catalog/*` | Produits + stock | — |
| DeliveriesClient | `components/deliveries/DeliveriesClient.tsx` | Livraisons + COD | — |
| AnalyticsClient | `components/analytics/AnalyticsClient.tsx` | Graphiques analytics | — |
| TeamPageClient | `components/team/TeamPageClient.tsx` | Équipe + journal | initialTab |
| TrackingClient | `components/track/TrackingClient.tsx` | Suivi public | — |
| StatusBadge / Card / EmptyState / TurnstileWidget | `components/ui/*` | Primitives UI | StatusBadge: status |
| RoleGuard | `components/RoleGuard.tsx` | Garde de rendu par rôle | — |
| CspNonceProvider / SentryUserProvider | `components/providers/*` | Contextes nonce / Sentry | — |
| Marketing Navbar/Footer/PricingToggle/WaitlistForm | `components/marketing/*` | Landing | — |

Contexts : `lib/role-context.tsx` (RoleProvider), `lib/mobile-nav-context.tsx`.

---

## 15. Conventions de code

- **Erreurs server actions** : retournent `{ error?: string }` (la plupart : `OrderMutationResult`, `{error?:string}`). Quelques-unes lèvent (`throw new Error`) : `updateOrderStatus`, `confirmPendingOrder`, `cancelPendingOrder`, `updateProfile`, `updateSlug`. Codes spéciaux propagés tels quels : `LIMIT_REACHED`, `CANNOT_DELETE`, `SUBSCRIPTION_EXPIRED`.
- **Erreurs API routes** : `NextResponse.json({ error }, { status })`. Routes publiques OTP : helper `noStoreJson` (Cache-Control no-store). Statuts cohérents : 400 (validation), 401 (non auth), 403 (CSRF/plan/inactif), 404, 409 (conflit stock), 429 (rate limit, + Retry-After), 503 (anti-spam indispo).
- **Palette de couleurs (hex)** : vert principal `#16A34A`, vert foncé `#0B5E46`, vert accent `#4ADE80`, fonds `#FAFAF9` / `#F5F5F4`, texte `#1C1917` / `#78716C` / `#44403C`, bordures `#E7E5E4`. Statuts via `ORDER_STATUS_CONFIG` (amber/blue/sky/orange/green/red/gray). Tailwind classe `.card`.
- **Cache** : `unstable_cache` scopé par seller (tag `dashboard-${sellerId}`) dans le dashboard ; invalidation par `revalidateTag('dashboard-${sellerId}')` + `revalidatePath` après chaque mutation. `getUserContext` via `React.cache`.
- **Validation** : **Zod** partout. Schémas notables : `RegisterSchema`, `ContactSchema`, `WaitlistSchema`, `SendOtpSchema`, `VerifyOtpSchema` (+ `HanutAddressFieldsSchema`), `ProductSchema`/`UpdateProductSchema`, `InviteMemberSchema`, `OrderItemInputSchema`. Adresses : `lib/address.ts` (`HanutAddressFieldsSchema`, `HanutContactAddressSchema`, normalisation).
- **Téléphone** : `formatTunisianPhone` + `isValidTunisianPhone` (`lib/constants.ts`).
- **Supabase clients** : `lib/supabase/server.ts` (RSC, cookies), `client.ts` (browser), `service.ts` (`createServiceClient`, bypass RLS — serveur uniquement).
- **Classes Tailwind récurrentes** : `rounded-2xl`, `rounded-xl`, `shadow-sm/md/xl/2xl`, `border-gray-100/200`, `text-xs/sm font-semibold/bold`, layout `flex`/`grid grid-cols-{1..3}`.
- **Logging** : `logActivity` (`lib/activity.ts`) après chaque mutation (sanitize téléphones, Sentry sur échec).

---

## 16. Tests existants

> `apps/web/__tests__/` (Vitest). Configs : `vitest.config`, `vitest.integration.config.ts`, `vitest.e2e.config.ts`. Sous-dossiers `e2e/`, `integration/`.

| Fichier | Module testé | Type |
|---|---|---|
| activity-sanitize.test.ts | `sanitizeDescription` | unit |
| assert-active.test.ts | `assertActive`/`requireActive` | unit |
| auth-callback-route.test.ts | route callback | route |
| auth-redirect.test.ts | `buildAuthCallbackUrl`/`getAppOrigin` | unit |
| catalog-actions.test.ts | server actions catalog | unit (mock) |
| csrf.test.ts | `checkOrigin` | unit |
| customer-addresses.test.ts | `buildActiveCustomerAddresses` | unit |
| customer-cursor-route.test.ts | `/api/customers/cursor` | route |
| customer-tags-notes.test.ts | CRM tags/notes | unit |
| dashboard-analytics.test.ts | helpers analytics | unit |
| dashboard-create-order.test.ts | `createOrder` action | unit (mock) |
| deliveries-actions.test.ts | actions livraisons | unit |
| deliveries-bulk-route.test.ts | `/api/deliveries/bulk` | route |
| demo-expiry.test.ts | démo expirée (middleware) | route |
| e2e-auth-demo.test.ts | auth + démo | e2e |
| e2e-public-order.test.ts | commande publique OTP | e2e |
| get-context.test.ts | `getUserContext` | unit |
| middleware.test.ts | CSP + auth gate | route |
| onboarding-route.test.ts | `/api/onboarding` | route |
| operator-permissions.test.ts | permissions operator | unit |
| order-actions.test.ts | actions commandes | unit |
| order-cursor-route.test.ts | `/api/orders/cursor` | route |
| order-otp-routes.test.ts | send-otp/verify-otp | route |
| order-search-route.test.ts | `/api/orders` (search) | route |
| order-transitions.test.ts | machine d'état | unit |
| pending-cod-count-route.test.ts | `/api/deliveries/pending-cod-count` | route |
| pending-orders-count-route.test.ts | `/api/orders/pending-count` | route |
| plan-limits-sync.test.ts | cohérence 100 (constants vs SQL) | unit |
| public-order-route.test.ts | `/api/orders/public` (410) | route |
| rate-limit.test.ts | `getClientIp` | unit |
| register-route.test.ts | `/api/auth/register` | route |
| supabase-migrations.test.ts | sanity migrations SQL | unit |
| tracking-public.test.ts | `/api/track/[orderId]` | route |
| utils.test.ts | `escapeLikePattern` etc. | unit |
| RLS_MANUAL_TESTS.md | tests RLS manuels (doc) | doc |

---

## 17. Variables d'environnement requises

> Source : `apps/web/.env.local.example`, `lib/env.ts` (`validateEnv` — throw en prod si manquant). `docs/DEPLOYMENT.md`.

**Obligatoires** (`requiredEnvVars`) :
- `NEXT_PUBLIC_SUPABASE_URL` — URL projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé publique anon.
- `SUPABASE_SERVICE_ROLE_KEY` — clé service (bypass RLS, sert aussi de secret HMAC OTP). **Serveur uniquement.**
- `NEXT_PUBLIC_APP_URL` — URL canonique (emails Supabase, CSRF). En prod jamais une URL preview Vercel.

**Sécurité anti-spam** (`securityEnvVars` — warning si absent, formulaires publics bloqués en prod) :
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile.

**Autres** :
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — CTAs upgrade / billing (ex. `21600000000`).
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — emails OTP (sans → console en dev, blocage en prod).
- `HANUT_ADMIN_EMAILS` — emails admin plateforme (page `/admin`), séparés par virgules.
- Sentry : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=hanut`, `SENTRY_PROJECT=javascript-nextjs`.
- Injectées par Vercel : `VERCEL`, `VERCEL_ENV` (HSTS prod), `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`.

**Réservées (commentées, fonctionnalités futures)** : `TWILIO_*` (SMS), `KONNECT_*` (paiement), `INTIGO_*`, `NAVEX_*` (APIs transporteurs).

---

## 18. Dette technique connue

- **Limite Starter 100 dupliquée** entre `lib/constants.ts` et la RPC `create_order_with_stock`/`create_order_with_items` (test `plan-limits-sync.test.ts` garde-fou).
- **Hook JWT manuel** : sans activation, 3 requêtes DB/requête HTTP (fallback middleware) — perf à grande échelle.
- **`create_order_with_stock` historique** : signature redéfinie ~9 fois (12→19 params) au fil des migrations ; plusieurs migrations marquées « DÉPRÉCIÉ » conservées pour rejouabilité CI (`20260601`, `20260608_fix_variant`, `20260608_tracking_token`, `20260609`, `20260610_add_order_unit_cost` section RPC). Source de vérité = dernière migration (`20260717`).
- **Double modèle commande** : champ legacy `orders.product_id`/`variant`/`quantity` coexiste avec `order_items` (multi-produits). L'order garde un « produit principal ».
- **Double modèle adresse** : champs legacy `address`/`city` + structuré `customer_*` (address_version). Migrations de backfill multiples.
- **`tags` customers** : TEXT[] dans le schéma de base mais peut être JSONB sur projets existants → `anonymize_customer` gère les deux dynamiquement.
- **Pas de purge auto corbeille** après 30 j (restauration bloquée > 30 j mais suppression manuelle).
- **APIs transporteurs non implémentées** (env vars commentées) ; tracking = liens manuels.
- **Pas de paiement en ligne** : activation manuelle WhatsApp sous 24 h.
- Triggers compteurs clients ont eu des bugs corrigés (double `order_count` → `20260624`).
- `HANUT_AUDIT_FULL.md` (racine, non versionné dans le commit principal) et `HANUT_AUDIT_4.md` (supprimé) — audits hors scope de ce document.

---

## 19. Features non implémentées (marketing/roadmap vs code)

- **Plan Business** : annoncé « Bientôt disponible » (multi-boutiques, accès API, équipe illimitée, rapport fiscal). `PLAN_LIMITS.business` existe mais aucun flux d'activation/pricing.
- **Intégration API transporteurs** : « création de colis et statut automatique » annoncé « en cours » (landing). Code = liens de tracking manuels seulement.
- **SMS automatiques** : roadmap (mémoire projet) ; env `TWILIO_*` commentées ; aucune implémentation.
- **Paiement en ligne** (Konnect/eDinar/Paymee) : mentionné comme moyen de paiement hors-app ; aucune intégration.
- **Vidéo démo** : placeholder « disponible bientôt » (landing).
- **Analytics avancés** (roadmap mémoire) : top produits/clients/villes existent (Pro), comparaison de période existe ; « analytics avancés » comme item roadmap à préciser avec le fondateur.
- Roadmap mémoire (`project_roadmap.md`) listait 5 features : lien public ✅, fiche client enrichie ✅ (tags/notes/adresses), SMS auto ❌, multi-users ✅ (équipe), analytics avancés (partiel).

---

## 20. Décisions produit et business actées

- **Trial = Pro 14 jours**, sans carte, automatique à l'inscription. Pas de carte bancaire demandée nulle part.
- **Paiement hors plateforme** : virement / mobile money / main propre, activation manuelle WhatsApp sous 24 h. Pas de Stripe/checkout.
- **OTP email obligatoire** pour toute commande publique (l'ancien flux direct est mort, 410).
- **Annulation = RPC dédiée** (jamais via `update_order_status`) pour restaurer le stock atomiquement. Commande **expédiée non annulable directement** : passer par `returned` puis `cancelled` (`docs/WORKFLOWS.md`).
- **Stock = source de vérité variantes** : `products.stock = SUM(variants.qty)` maintenu par trigger ; le COD par défaut = `price × quantity`.
- **Adresses structurées tunisiennes** (gouvernorat/ville/délégation/adresse/repère/code postal) sont la cible (address_version 2) ; legacy conservé.
- **Propriétaire ≠ admin promu** : seul l'owner réel supprime le compte et change le slug.
- **Downgrade Pro→Starter suspend l'équipe** (réversible), ne supprime pas.
- **Anonymisation conserve la ligne client** (intégrité commandes), irréversible, admin-only, conforme loi tunisienne 2004-63.
- **5 transporteurs fixes** : IntiGo, Navex, Adex, Aramex, Best Delivery.
- **Limite Starter = 100 commandes/mois** ; Pro/Business illimité.
- **Interface 100 % français**, marché tunisien exclusif (gouvernorats, téléphones, DT).
- **CSP par nonce + hook JWT** sont des décisions d'architecture (perf/sécurité) documentées dans `docs/DEPLOYMENT.md`.

---

*Fin du document. Pour toute zone marquée « à confirmer avec le fondateur », ne pas supposer — demander.*
