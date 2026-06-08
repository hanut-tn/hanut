# HANUT_CONTEXT.md
> Fichier de contexte généré le 2026-06-05 par lecture exhaustive du code source.
> À mettre à jour après chaque évolution significative de l'architecture.

---

## 1. Description du projet

**Hanut** est une application SaaS multi-tenant destinée aux **vendeurs e-commerce tunisiens** qui opèrent en **Cash On Delivery (COD)**. Le vendeur gère sa boutique en ligne : catalogue produits, commandes, livraisons, clients, équipe et analytics — depuis un dashboard web.

- **Pays cible** : Tunisie (monnaie DT, téléphone 8 chiffres, locale fr-TN)
- **Modèle COD** : chaque commande a un `cod_amount` en Dinars Tunisiens, pas de paiement en ligne
- **Lien public** : chaque vendeur a un slug (`/order/[slug]`) qui permet aux clients de passer commande directement
- **Suivi public** : les clients peuvent suivre leur commande via `/track/[orderId]`
- **Multi-utilisateurs** : plan Business uniquement — l'admin peut inviter jusqu'à 5 membres (Opérateur ou Lecture seule)

---

## 2. Stack technique

### Monorepo (Turborepo)
| Outil | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | 11.6.2 (packageManager) |
| Turbo | ^2.0.0 |
| TypeScript | ^5.4.0 |

### App Web (`apps/web`)
| Dépendance | Version | Rôle |
|---|---|---|
| Next.js | ^15.3.0 | Framework (App Router) |
| React | ^18.3.0 | UI |
| @supabase/supabase-js | ^2.43.0 | Client Supabase |
| @supabase/ssr | ^0.5.0 | SSR cookies Supabase |
| lucide-react | ^1.17.0 | Icônes |
| zod | ^4.4.3 | Validation de schémas |
| twilio | ^5.0.0 | SMS (dépendance installée, pas encore utilisée) |
| tailwindcss | ^3.4.3 | Styles utilitaires |
| vitest | ^4.1.8 | Tests |
| eslint | ^9.39.4 + eslint-config-next ^15.5.18 | Linting |

### Package partagé (`packages/types`)
- Contient les types TypeScript partagés : `Order`, `OrderStatus`, `Product`, `ProductVariant`, `Customer`, `Delivery`, `Seller`, `SellerPlan`, `CarrierName`

### Services externes (dans `.env.local`)
- **Supabase** : BDD PostgreSQL + Auth + Storage + RLS
- **Twilio** : SMS (non encore implémenté dans le code)
- **IntiGo, Navex** : transporteurs (URLs de tracking configurées, pas d'API sync)
- **Konnect** : paiement (mentionné dans .env.example, aucun code trouvé)
- **APP_URL** : `https://hanut.tn` ou localhost

---

## 3. Structure complète du projet

```
hanut/
├── package.json                  # Monorepo root — scripts turbo
├── turbo.json                    # Config Turbo (non lu directement)
├── HANUT_CONTEXT.md              # Ce fichier
├── packages/
│   └── types/                    # @hanut/types — types partagés
│       └── src/
│           ├── index.ts          # Export barrel
│           ├── order.ts          # Order, OrderStatus, CreateOrderInput
│           ├── product.ts        # Product, ProductVariant, CreateProductInput
│           ├── customer.ts       # Customer, CreateCustomerInput
│           ├── delivery.ts       # Delivery, CarrierName, CreateDeliveryInput
│           └── seller.ts         # Seller, SellerPlan
└── apps/
    └── web/                      # Application Next.js principale
        ├── package.json          # @hanut/web
        ├── next.config.ts        # Config Next (images Supabase, transpile)
        ├── tailwind.config.ts    # Palette brand verte + font Inter
        ├── tsconfig.json         # Alias @/* → ./*, @hanut/types
        ├── middleware.ts         # Auth middleware (protège les routes dashboard)
        ├── app/
        │   ├── layout.tsx        # Root layout + globals.css
        │   ├── page.tsx          # Landing page marketing
        │   ├── (auth)/
        │   │   ├── layout.tsx    # Layout centré avec logo
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   ├── (marketing)/
        │   │   ├── layout.tsx    # Navbar + Footer
        │   │   ├── about/page.tsx
        │   │   ├── features/page.tsx
        │   │   ├── pricing/page.tsx
        │   │   ├── carriers/page.tsx
        │   │   ├── roadmap/page.tsx
        │   │   ├── mobile/page.tsx
        │   │   └── contact/page.tsx
        │   ├── (dashboard)/
        │   │   ├── layout.tsx         # Auth check + invitation + sidebar
        │   │   ├── error.tsx          # Error boundary
        │   │   ├── loading.tsx        # Skeleton
        │   │   ├── dashboard/page.tsx # KPIs + chart + actions rapides
        │   │   ├── orders/
        │   │   │   ├── page.tsx
        │   │   │   ├── actions.ts     # Server actions commandes
        │   │   │   ├── new/page.tsx
        │   │   │   └── [id]/page.tsx
        │   │   ├── customers/
        │   │   │   ├── page.tsx
        │   │   │   ├── actions.ts     # Server actions clients
        │   │   │   └── [id]/page.tsx
        │   │   ├── catalog/
        │   │   │   ├── page.tsx
        │   │   │   ├── actions.ts     # Server actions produits + stock
        │   │   │   └── [id]/page.tsx
        │   │   ├── deliveries/
        │   │   │   ├── page.tsx
        │   │   │   └── actions.ts     # Server actions livraisons
        │   │   ├── analytics/page.tsx
        │   │   ├── settings/
        │   │   │   ├── page.tsx
        │   │   │   └── actions.ts     # updateProfile, updateSlug, checkSlugAvailability
        │   │   └── team/page.tsx
        │   ├── order/[slug]/page.tsx  # Page publique commande par slug
        │   ├── track/[orderId]/page.tsx # Suivi public commande
        │   └── api/
        │       ├── auth/callback/route.ts
        │       ├── orders/
        │       │   ├── route.ts              # GET search (par nom/UUID)
        │       │   ├── list/route.ts         # GET paginé avec filtre statut
        │       │   ├── [id]/route.ts         # PUT update customer_id
        │       │   ├── public/route.ts       # POST commande publique (rate limited)
        │       │   └── pending-count/route.ts # GET count pending/new
        │       ├── customers/
        │       │   ├── route.ts              # GET (legacy)
        │       │   ├── list/route.ts         # GET paginé + search
        │       │   └── [id]/route.ts         # GET détail + PUT tags/notes
        │       ├── team/
        │       │   ├── route.ts              # GET liste + POST invite
        │       │   ├── [memberId]/route.ts   # PUT rôle + DELETE
        │       │   └── [memberId]/resend/route.ts # POST renvoyer invitation
        │       ├── activity/route.ts         # GET + POST logs activité
        │       ├── onboarding/route.ts       # PATCH étapes onboarding
        │       ├── analytics/export/route.ts # GET CSV export
        │       ├── track/[orderId]/route.ts  # GET suivi public (rate limited)
        │       ├── contact/route.ts          # POST formulaire contact
        │       └── waitlist/route.ts         # POST inscription waitlist
        ├── components/
        │   ├── RoleGuard.tsx              # Wrapper conditionnel selon le rôle
        │   ├── dashboard/
        │   │   ├── Sidebar.tsx            # Nav desktop — items, badge pending, plan
        │   │   ├── MobileSidebar.tsx      # Drawer mobile
        │   │   ├── TopBar.tsx             # Header — nom, rôle
        │   │   ├── BottomNav.tsx          # Nav mobile bas d'écran
        │   │   ├── CopyLinkButton.tsx     # Copie le lien public + log onboarding
        │   │   ├── OnboardingChecklist.tsx # Checklist pour nouveaux vendeurs
        │   │   ├── OperatorDashboard.tsx  # Dashboard simplifié opérateurs
        │   │   ├── ReadonlyDashboard.tsx  # Dashboard read-only
        │   │   └── usePendingOrdersCount.ts # Hook polling /api/orders/pending-count
        │   ├── orders/
        │   │   ├── OrdersClient.tsx       # Liste complète avec tabs/search/trash/opti
        │   │   ├── OrderDetail.tsx        # Détail commande
        │   │   └── NewOrderForm.tsx       # Formulaire nouvelle commande
        │   ├── catalog/
        │   │   ├── CatalogClient.tsx      # Liste produits
        │   │   ├── ProductDetailClient.tsx # Détail produit + modale stock
        │   │   └── ProductModal.tsx       # Create/edit produit
        │   ├── customers/
        │   │   ├── CustomersClient.tsx    # Liste clients
        │   │   └── CustomerDetail.tsx     # Détail client + historique commandes
        │   ├── deliveries/
        │   │   └── DeliveriesClient.tsx   # Liste livraisons
        │   ├── analytics/
        │   │   └── AnalyticsClient.tsx    # Charts + stats 180 jours
        │   ├── settings/
        │   │   └── SettingsClient.tsx     # Profil + slug
        │   ├── team/
        │   │   └── TeamPageClient.tsx     # Membres + journal d'activité
        │   ├── order/
        │   │   └── OrderForm.tsx          # Formulaire commande publique
        │   ├── track/
        │   │   └── TrackingClient.tsx     # Page suivi public
        │   ├── marketing/
        │   │   ├── Navbar.tsx
        │   │   ├── Footer.tsx
        │   │   ├── WaitlistForm.tsx
        │   │   └── PricingToggle.tsx
        │   └── ui/
        │       ├── StatusBadge.tsx        # Badge statut commande coloré
        │       ├── Card.tsx
        │       └── EmptyState.tsx
        └── lib/
            ├── get-context.ts            # getUserContext() — résolution rôle/seller
            ├── activity.ts               # logActivity() — journal d'actions
            ├── rate-limit.ts             # checkRateLimit() + getClientIp()
            ├── constants.ts              # Statuts, transporteurs, config
            ├── utils.ts                  # relativeDate, initials, formatDT, formatDate
            ├── role-context.tsx          # RoleProvider + useRole() hook
            ├── mobile-nav-context.tsx    # MobileNavProvider + useMobileNav()
            └── supabase/
                ├── client.ts             # Client navigateur (createBrowserClient)
                ├── server.ts             # Client serveur avec cookies
                └── service.ts            # Client service_role (bypass RLS)
```

---

## 4. Base de données

### Tables

#### `sellers`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | = auth.users.id |
| email | TEXT UNIQUE NOT NULL | |
| name | TEXT NOT NULL | Nom de la boutique |
| phone | TEXT | |
| plan | TEXT | 'starter' \| 'pro' \| 'business' |
| subscription_end | TIMESTAMPTZ | |
| slug | TEXT UNIQUE | Lien public (index partiel WHERE slug IS NOT NULL) |
| onboarding_completed | BOOLEAN | |
| onboarding_steps | JSONB | `{ link_copied: boolean }` |
| created_at | TIMESTAMPTZ DEFAULT now() | |

#### `customers`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers | |
| name | TEXT NOT NULL | |
| phone | TEXT NOT NULL | |
| address | TEXT | |
| city | TEXT | Gouvernorat |
| order_count | INTEGER | Incrémenté par trigger ou RPC |
| tags | TEXT[] DEFAULT '{}' | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
Index : `(seller_id, phone)`

#### `products`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers | |
| name | TEXT NOT NULL | |
| price | NUMERIC ≥ 0 | Prix de vente COD |
| cost | NUMERIC ≥ 0 | Coût d'achat (optionnel) |
| stock | INTEGER ≥ 0 | |
| low_stock_alert | INTEGER ≥ 0 | Seuil alerte |
| variants | JSONB | `ProductVariant[]` — `[{size?, color?, qty}]` |
| image_url | TEXT | URL Supabase Storage bucket `product-images` |
| description | TEXT | |
| created_at | TIMESTAMPTZ | |
Contraintes : price ≥ 0, cost ≥ 0, stock ≥ 0, low_stock_alert ≥ 0

#### `orders`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers | |
| customer_id | UUID FK customers | |
| product_id | UUID FK products | |
| variant | TEXT | Label variante ex: "M / Rouge" |
| quantity | INTEGER > 0 | |
| cod_amount | NUMERIC ≥ 0 | Montant COD en DT |
| status | TEXT CHECK | 'pending' \| 'new' \| 'confirmed' \| 'shipped' \| 'delivered' \| 'returned' |
| notes | TEXT | |
| deleted_at | TIMESTAMPTZ | NULL = active, non-NULL = corbeille |
| archived_by | UUID FK auth.users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
Index : `(seller_id, status)`

#### `deliveries`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK orders | |
| carrier | TEXT | 'intigo' \| 'navex' \| 'adex' \| 'aramex' \| 'bestdelivery' |
| tracking_number | TEXT | |
| carrier_status | TEXT | Statut transporteur (texte libre) |
| fee | NUMERIC ≥ 0 | Frais de livraison |
| cod_collected | BOOLEAN DEFAULT false | COD physiquement collecté |
| cod_reversed | BOOLEAN DEFAULT false | COD reversé au vendeur |
| delivered_at | TIMESTAMPTZ | Mis à jour quand cod_collected = true |
| created_at | TIMESTAMPTZ | |

#### `team_members`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers ON DELETE CASCADE | |
| user_id | UUID FK auth.users ON DELETE CASCADE | NULL avant acceptation |
| role | TEXT CHECK | 'admin' \| 'operator' \| 'readonly' |
| email | TEXT NOT NULL | |
| name | TEXT | |
| status | TEXT CHECK DEFAULT 'pending' | 'pending' \| 'active' |
| invited_at | TIMESTAMPTZ DEFAULT now() | |
| joined_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | Invitation expire 7 jours après envoi |
Unique : `(seller_id, user_id)`, `(seller_id, email)`

#### `activity_logs`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers | |
| user_id | UUID FK auth.users ON DELETE SET NULL | |
| user_name | TEXT NOT NULL DEFAULT '' | Résolu au moment du log |
| action_type | TEXT NOT NULL | Ex: 'order_created', 'product_updated'... |
| entity_type | TEXT | 'order' \| 'product' \| 'customer' \| 'delivery' \| 'team_member' |
| entity_id | TEXT | UUID de l'entité |
| description | TEXT NOT NULL | Phrase humaine en français |
| metadata | JSONB DEFAULT '{}' | Données additionnelles |
| created_at | TIMESTAMPTZ DEFAULT now() | |

#### `order_status_history`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK orders ON DELETE CASCADE | |
| status | TEXT NOT NULL | |
| changed_at | TIMESTAMPTZ DEFAULT now() | |
| changed_by | UUID FK auth.users | NULL si commande publique |

#### `stock_movements`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| seller_id | UUID FK sellers ON DELETE CASCADE | |
| product_id | UUID FK products ON DELETE CASCADE | |
| variant_name | TEXT | |
| quantity_before | INTEGER | |
| quantity_after | INTEGER | |
| delta | INTEGER NOT NULL | +N ou -N |
| movement_type | TEXT CHECK | 'order' \| 'order_cancel' \| 'restock' \| 'correction' \| 'return' \| 'loss' |
| unit_cost | DECIMAL(10,2) | Pour restock |
| supplier | TEXT | Pour restock |
| notes | TEXT | |
| order_id | UUID FK orders ON DELETE SET NULL | Pour movement_type='order' |
| created_by | UUID FK auth.users | |
| created_by_name | TEXT NOT NULL DEFAULT '' | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

#### `waitlist`
| Colonne | Type |
|---|---|
| id | UUID PK |
| email | TEXT UNIQUE NOT NULL |
| created_at | TIMESTAMPTZ |

#### `contact_messages`
| Colonne | Type |
|---|---|
| id | UUID PK |
| name | TEXT NOT NULL |
| email | TEXT NOT NULL |
| message | TEXT NOT NULL |
| created_at | TIMESTAMPTZ |

#### `rate_limits`
Table utilisée par la fonction `check_rate_limit()` — structure interne (fenêtre glissante 24h).

### Fonctions SQL (RPC)

#### `create_order_with_stock(...)` — SECURITY DEFINER
Crée une commande et décrémente le stock **atomiquement** (verrou `FOR UPDATE`).
Paramètres : `p_seller_id, p_product_id, p_quantity, p_customer_name, p_customer_phone, p_customer_address, p_customer_city, p_customer_id, p_variant, p_cod_amount, p_notes, p_status`
- Crée le client s'il n'existe pas (lookup par `phone`)
- Met à jour le client si déjà existant
- Valide stock ≥ quantité demandée
- COD par défaut = `price × quantity` si non fourni
- Retourne l'UUID de la commande créée

#### `get_seller_id()` — SECURITY DEFINER, STABLE
Retourne le `seller_id` de l'utilisateur courant (owner en priorité, sinon membre d'équipe actif).

#### `get_team_role(p_seller_id UUID)` — SECURITY DEFINER, STABLE
Retourne le rôle de l'utilisateur courant pour un seller donné ('admin' si owner, sinon rôle team_member).

#### `can_write_seller(p_seller_id UUID)` — SECURITY DEFINER, STABLE
Retourne `true` si le rôle est 'admin' ou 'operator'.

#### `check_rate_limit(p_identifier, p_endpoint, p_max_requests, p_window_seconds)` — RPC
Rate limiting par IP + endpoint. Retourne `{allowed, remaining, reset_in}`.

#### `search_orders()` — RPC
Recherche d'ordres par UUID prefix ou nom/téléphone client.

### Policies RLS

Toutes les tables métier ont RLS activée. Pattern général :
- **SELECT** : `seller_id = get_seller_id()` (tout membre de l'équipe peut lire)
- **INSERT/UPDATE/DELETE** : `can_write_seller(seller_id)` (admin + operator uniquement)
- **team_members** : politiques spéciales permettant l'activation de son invitation
- **order_status_history** : lecture via RLS, écriture via `can_write_seller`, le suivi public utilise `createServiceClient` (bypass RLS)

### Ordre des migrations
```
20260601_add_missing_app_schema.sql        # slug sellers, tags/notes customers, contraintes, waitlist, contact_messages
20260601_create_order_with_stock_rpc.sql   # create_order_with_stock()
20260602_add_activity_logs.sql             # table activity_logs
20260602_add_orders_soft_delete.sql        # deleted_at + archived_by sur orders
20260602_add_products_description.sql      # description produits + bucket product-images
20260602_add_team_members.sql              # team_members, get_seller_id(), get_team_role(), can_write_seller() + RLS
20260603_add_onboarding.sql                # onboarding_completed + onboarding_steps sur sellers
20260603_add_rate_limits.sql               # table rate_limits + check_rate_limit()
20260603_search_orders_rpc.sql             # search_orders()
20260604_add_team_invitations_expiry.sql   # expires_at sur team_members
20260604_order_status_history.sql          # table order_status_history
20260605_stock_movements.sql               # table stock_movements
```

---

## 5. Authentification

### `getUserContext()` — `lib/get-context.ts`
Fonction cachée avec `React.cache()` (déduplique les appels par requête HTTP).

Retourne `UserContext | null` :
```ts
type UserContext = {
  userId: string
  sellerId: string
  role: 'admin' | 'operator' | 'readonly'
  isSeller: boolean
  plan: 'starter' | 'pro' | 'business'
}
```

Logique de résolution :
1. Vérifie la session Supabase (`auth.getUser()`)
2. Si `sellers.id = user.id` → admin (owner)
3. Sinon cherche `team_members` actif → role du membre
4. Si rien → retourne `null`

### Middleware (`middleware.ts`)
Protège toutes les routes `/dashboard/*` et redirige vers `/login` si non authentifié.
Routes publiques : `/`, `/login`, `/register`, `/features`, `/pricing`, `/about`, `/carriers`, `/mobile`, `/roadmap`, `/contact`, `/order/*`, `/track/*`, `/api/contact`, `/api/waitlist`, `/api/orders/public`, `/api/track/*`.
Si connecté et sur `/` → redirige vers `/dashboard`.

### Dashboard Layout (`app/(dashboard)/layout.tsx`)
Au premier chargement du dashboard :
1. Active l'invitation en attente si l'email correspond (status pending → active)
2. Résout le contexte via `getUserContext()`
3. Crée le profil seller si manquant (filet de sécurité post-inscription)
4. Injecte `RoleProvider` et `MobileNavProvider` dans l'arbre React

### Invitation d'équipe
1. Admin POST `/api/team` → insère `team_members` (status=pending, expires_at=+7j) + `auth.admin.inviteUserByEmail()`
2. Supabase envoie un email d'invitation avec lien → `/api/auth/callback`
3. L'utilisateur se crée un compte ou se connecte
4. Dashboard layout détecte l'invitation pending → met à jour `user_id`, `status=active`, `joined_at`

### Rôles et permissions
| Permission | admin | operator | readonly |
|---|---|---|---|
| Lire les données | ✅ | ✅ | ✅ |
| Créer/modifier commandes, produits, livraisons | ✅ | ✅ | ❌ |
| Supprimer commandes | ✅ | ❌ | ❌ |
| Gérer l'équipe | ✅ | ❌ | ❌ |
| Voir analytics | ✅ | ❌ | ✅ |
| Modifier profil/slug | ✅ | ❌ | ❌ |
| Exporter CSV | Pro/Business uniquement | — | — |

---

## 6. Routes API

### Publiques (sans auth)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/orders/public` | Créer une commande via lien public. Rate limit 10 req/60min par IP. Valide slug→seller, product appartient au seller, variante, stock. Crée status='pending'. |
| GET | `/api/track/[orderId]` | Suivi public d'une commande. Rate limited. Retourne order + historique statuts. Utilise service client (bypass RLS). |
| POST | `/api/contact` | Formulaire contact. Rate limited. Insère dans contact_messages. |
| POST | `/api/waitlist` | Inscription waitlist. Rate limited. Insère email unique dans waitlist. |
| GET | `/api/auth/callback` | Callback OAuth Supabase (échange code session). |

### Protégées (auth requise)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/orders` | Tous | Recherche commandes par nom/téléphone client ou UUID prefix. |
| GET | `/api/orders/list` | Tous | Liste paginée (20/page). Params: `page`, `limit`, `status`. |
| PUT | `/api/orders/[id]` | Admin/Operator | Met à jour `customer_id` d'une commande. |
| GET | `/api/orders/pending-count` | Tous | Count commandes pending+new. |
| GET | `/api/customers/list` | Tous | Liste paginée clients avec search. Params: `page`, `search`. |
| GET | `/api/customers/[id]` | Tous | Détail client : commandes paginées + stats. |
| PUT | `/api/customers/[id]` | Admin/Operator | Mise à jour `tags` et `notes` du client. |
| GET | `/api/team` | Business | Liste membres équipe. |
| POST | `/api/team` | Admin + Business | Inviter un membre (max 5, vérifie doublons). |
| PUT | `/api/team/[memberId]` | Admin | Modifier rôle d'un membre. |
| DELETE | `/api/team/[memberId]` | Admin | Supprimer un membre. |
| POST | `/api/team/[memberId]/resend` | Admin | Renvoyer l'email d'invitation. |
| GET | `/api/activity` | Admin | Journal d'activité paginé avec filtres. |
| POST | `/api/activity` | Admin/Operator | Créer une entrée de log. |
| PATCH | `/api/onboarding` | Admin | Mettre à jour les étapes d'onboarding (`link_copied`, `complete`). |
| GET | `/api/analytics/export` | Admin + Pro/Business | Export CSV résumé journalier 90 jours. |

---

## 7. Composants

### Dashboard Navigation
- **`Sidebar`** : nav desktop. Items : Tableau de bord, Commandes (badge pending en orange), Clients, Catalogue, Livraisons, Analytique (admin/readonly seulement), Paramètres, Équipe (admin + Business seulement). Affiche plan en bas.
- **`MobileSidebar`** : drawer lateral mobile, même contenu que Sidebar.
- **`TopBar`** : header dashboard — logo + nom vendeur + rôle.
- **`BottomNav`** : navigation mobile fixée en bas. Items conditionnels selon rôle.
- **`usePendingOrdersCount`** : hook qui poll `/api/orders/pending-count` toutes les 60s pour afficher le badge.

### Dashboard Home
- **`OperatorDashboard`** : vue simplifiée pour les opérateurs (commandes récentes, pas de KPIs financiers).
- **`ReadonlyDashboard`** : vue lecture seule (données agrégées uniquement).
- **`CopyLinkButton`** : copie `hanut.tn/order/[slug]`, déclenche le log onboarding `link_copied`.
- **`OnboardingChecklist`** : 3 étapes (ajouter produit, copier lien, première commande). Visible jusqu'à `onboarding_completed = true`.

### Commandes
- **`OrdersClient`** : composant client complet.
  - Tabs : Toutes / En attente / Nouvelles / Confirmées / Expédiées / Livrées / Retournées / Corbeille
  - Recherche fulltext (debounce 300ms) via `/api/orders`
  - Pagination "charger plus" via `/api/orders/list`
  - **Optimistic updates** : changement de statut, suppression, restauration reflétés immédiatement
  - Actions par statut : Confirmer (pending→new, new→confirmed), Expédier (confirmed→shipped), Livré (shipped→delivered), Annuler (pending→returned)
  - Vue Corbeille : restauration sous 30 jours, suppression définitive avec confirmation "SUPPRIMER"
  - Export CSV : admin seulement, plan Pro/Business
  - Recherche highlighting des termes trouvés
- **`OrderDetail`** : détail d'une commande — historique statuts, client lié, stats client, actions.
- **`NewOrderForm`** : formulaire de création — lookup client par téléphone, sélection produit/variante, validation stock.

### Catalogue
- **`CatalogClient`** : liste produits avec alerte stock bas, filtre, création via modal.
- **`ProductDetailClient`** : détail produit.
  - Affiche : image, prix, marge, description, stock (barre colorée), variantes
  - Stats : commandes totales, CA livré, vendu ce mois, taux de retour
  - Historique stock_movements (5 derniers)
  - Modale ajustement stock : 4 types (Réapprovisionnement, Correction inventaire, Retour fournisseur, Perte/Casse) avec aperçu avant/après et support variantes
  - Optimistic update du stock local avant réponse serveur
- **`ProductModal`** : create/edit produit — nom, prix, coût, stock, alert, variantes, image upload, description.

### Clients
- **`CustomersClient`** : liste clients avec stats (revenus totaux, nb commandes), filtre, pagination.
- **`CustomerDetail`** : détail client — historique commandes, stats, édition nom/téléphone/adresse/ville.

### Livraisons
- **`DeliveriesClient`** : liste livraisons, création depuis commande confirmée, mise à jour tracking/COD, suppression.

### Analytics
- **`AnalyticsClient`** : fenêtre 180 jours (90j courant + 90j précédent pour comparaison).
  - Graphiques : CA par période, taux livraison, top produits, répartition transporteurs
  - Export CSV disponible (plan Pro/Business)
  - Non accessible aux opérateurs (redirect /orders)

### Paramètres
- **`SettingsClient`** : profil vendeur (nom, téléphone), slug public (validation 3-50 chars, check disponibilité en temps réel), stats boutique.

### Équipe
- **`TeamPageClient`** : liste membres avec statut/rôle/dernière connexion, actions (modifier rôle, supprimer, renvoyer invitation), journal d'activité paginé.

### Public
- **`OrderForm`** : formulaire commande publique — sélection produit, variante, quantité, infos client (nom, téléphone, adresse, gouvernorat), notes. Soumet à `/api/orders/public`.
- **`TrackingClient`** : suivi commande par ID — statut actuel, timeline historique, infos transporteur.

### UI génériques
- **`StatusBadge`** : badge coloré avec dot selon statut. Prop `pulseDot` pour animation (pending).
- **`RoleGuard`** : wrapper qui n'affiche son contenu que pour les rôles autorisés.
- **`Card`**, **`EmptyState`** : composants UI basiques.

---

## 8. Fonctionnalités implémentées

### Complètes à 100%

**Authentification**
- Inscription avec création profil seller (nom boutique, email, téléphone, génération slug auto avec collision handling)
- Connexion email/password
- Middleware de protection des routes
- Activation automatique invitation lors du premier accès dashboard

**Dashboard**
- KPIs mois en cours (commandes, CA livré, taux livraison, en transit)
- Comparaison mois précédent avec tendance (+/-%)
- Graphique barres CA 7 derniers jours
- Actions rapides (nouvelle commande, ajouter produit, copier lien, livraisons)
- 5 commandes récentes
- Checklist onboarding (3 étapes)
- Vues adaptées selon rôle (operator, readonly)

**Commandes**
- Création via formulaire ou lien public
- Cycle de vie complet : pending → new → confirmed → shipped → delivered/returned
- Corbeille avec restauration 30 jours
- Suppression définitive avec confirmation textuelle
- Recherche fulltext (nom, téléphone, UUID)
- Filtrage par statut avec compteurs
- Pagination infinite scroll
- Optimistic updates pour toutes les actions
- Export CSV (Pro/Business)
- Actions rapides inline (confirmer, expédier, livrer, annuler)

**Catalogue**
- CRUD produits complet
- Variantes (taille/couleur avec stock individuel)
- Upload image (bucket Supabase `product-images`, max 5 Mo)
- Description produit
- Alerte stock bas (seuil configurable)
- Coût d'achat + calcul marge automatique
- Historique mouvements de stock
- Ajustement stock (4 types : restock, correction, retour, perte)
- Stats produit (commandes, CA, vendu ce mois, taux retour)
- Blocage suppression si commandes liées

**Clients**
- Création automatique à la première commande (lookup par téléphone)
- Édition nom/téléphone/adresse/ville
- Tags et notes
- Historique commandes paginé
- Stats (CA total, nb commandes, produit favori)
- Blocage suppression si commandes actives ou en corbeille

**Livraisons**
- Création depuis commande confirmée
- 5 transporteurs : IntiGo, Navex, Adex, Aramex, Best Delivery
- Suivi tracking number + statut transporteur
- Frais de livraison
- COD collecté (avec timestamp delivered_at)
- COD reversé
- Suppression bloquée si COD collecté
- Remise en "Confirmée" si livraison supprimée depuis "Expédiée"

**Analytics**
- 180 jours de données (90j courant + 90j précédent)
- Comparaison périodes
- Répartition par transporteur
- Top produits
- Export CSV résumé journalier

**Équipe (Business)**
- Invitation par email (Supabase auth.admin.inviteUserByEmail)
- Expiration invitation 7 jours
- Renvoi invitation
- Rôles : operator (read/write) ou readonly
- Max 5 membres
- Dernière connexion
- Blocage invitation si email déjà vendeur

**Journal d'activité**
- Toutes les actions loggées (commande créée, modifiée, supprimée, produit, client, livraison, membre équipe)
- Résolution du nom utilisateur (team_member.name ou sellers.name)
- Pagination
- Visible dans /team (admin) et via /api/activity

**Lien public & Suivi**
- Page `/order/[slug]` — formulaire de commande pour les clients
- Rate limit 10 req/60min par IP
- Validation téléphone tunisien (8 chiffres, strip préfixe 216)
- Page `/track/[orderId]` — suivi commande avec timeline

**Paramètres**
- Modification nom/téléphone boutique
- Slug personnalisé (3-50 chars, alphanumérique + tirets, vérification disponibilité temps réel)

**Marketing**
- Landing page avec hero, transporteurs, fonctionnalités, how-it-works, témoignages
- Pages : features, pricing, about, carriers, roadmap, mobile, contact
- Formulaire waitlist et contact avec rate limiting

---

## 9. Identité visuelle

### Couleurs
| Classe Tailwind | Hex | Usage |
|---|---|---|
| `brand-50` | #F0FDF4 | Fonds légers (avatars, icônes) |
| `brand-100` | #DCFCE7 | |
| `brand-600` | #16A34A | **Couleur principale** — boutons, liens, valeurs positives |
| `brand-700` | #15803D | Hover boutons |
| `brand-900` | #14532D | Texte sur fond vert |
| `[#0B5E46]` | #0B5E46 | Vert foncé (logo, actions critiques) |
| `[#FAFAF9]` | #FAFAF9 | Background général |
| `[#1C1917]` | #1C1917 | Texte primaire |
| `[#78716C]` | #78716C | Texte secondaire |
| `[#A8A29E]` | #A8A29E | Texte désactivé/muted |
| `[#E7E5E4]` | #E7E5E4 | Bordures |
| `[#D6D3D1]` | #D6D3D1 | Bordures hover |

### Typographie
- Police : **Inter** via `var(--font-inter)` (Google Fonts ou Next.js font)
- Locale : `fr-TN` pour les formatages de dates et nombres

### Icônes
- **Lucide React** exclusivement

### Classes CSS communes
```
btn-primary    → bouton principal vert (#16A34A)
btn-secondary  → bouton secondaire gris
input          → champ de formulaire standard
rounded-xl     → coins arrondis (12px) — standard pour les cartes
shadow-sm      → ombre légère sur les cartes
```

### Statuts commandes — couleurs
| Statut | BG | Text | Dot |
|---|---|---|---|
| pending | amber-50 | amber-700 | amber-500 (pulsé) |
| new | blue-50 | blue-700 | blue-500 |
| confirmed | sky-50 | sky-700 | sky-500 |
| shipped | orange-50 | orange-700 | orange-500 |
| delivered | green-50 | green-700 | green-500 |
| returned | red-50 | red-700 | red-500 |

---

## 10. Business Logic

### COD (Cash On Delivery)
- Toutes les commandes ont un `cod_amount` en DT
- Si non spécifié à la création → `cod_amount = prix × quantité` (calculé par le RPC)
- **COD pending** = commandes en statut 'confirmed' ou 'shipped' (argent attendu)
- `cod_collected = true` → livraison confirmée physiquement (delivered_at mis à jour)
- `cod_reversed = true` → vendeur a reçu son argent du transporteur
- Suppression livraison bloquée si `cod_collected = true`

### Lien de commande public
- Format : `hanut.tn/order/[slug]` (ou `localhost:3000/order/[slug]`)
- Le slug est unique par vendeur, minimum 3 caractères
- Seuls les produits avec `stock > 0` sont affichés
- Les commandes créées via lien public ont `status = 'pending'`
- Le vendeur doit confirmer (pending → new) ou annuler (pending → returned)
- Une commande pending annulée restaure le stock

### Stock
- Décrémenté **atomiquement** lors de la création de commande (via RPC `create_order_with_stock`)
- **Restauré** dans les cas suivants :
  - Soft-delete d'une commande en status pending/new/confirmed
  - Restauration d'une commande depuis la corbeille (en status pending/new/confirmed)
  - Annulation d'une commande pending (`cancelPendingOrder`)
- Mouvements loggés dans `stock_movements` avec type : order, order_cancel, restock, correction, return, loss

### Corbeille
- Soft-delete : `orders.deleted_at` renseigné, `archived_by` = userId
- Commandes expédiées (shipped) **non supprimables** (règle métier)
- Restauration possible 30 jours après suppression
- Restauration vérifie le stock disponible
- Suppression définitive : irréversible, confirmation par frappe "SUPPRIMER"
- Seuls les admins peuvent supprimer/restaurer

### Multi-utilisateurs
- Uniquement plan Business
- Maximum 5 membres par boutique
- Rôle operator : accès lecture/écriture, pas analytics, pas settings, pas équipe
- Rôle readonly : lecture seule de tout, pas de modifications
- Les membres voient les données du vendeur via `get_seller_id()` en RLS

### Statuts commandes
```
pending (lien public) → new → confirmed → shipped → delivered
                                                   ↘ returned
pending → returned (annulation)
```
- Seule transition manuelle autorisée depuis le dashboard
- L'historique est tracé dans `order_status_history`

### Plans
| Fonctionnalité | starter | pro | business |
|---|---|---|---|
| Commandes illimitées | ✅ | ✅ | ✅ |
| Catalogue illimité | ✅ | ✅ | ✅ |
| Lien public | ✅ | ✅ | ✅ |
| Export CSV | ❌ | ✅ | ✅ |
| Équipe | ❌ | ❌ | ✅ (max 5) |

---

## 11. Ce qui reste à faire

### Fonctionnalités manquantes (non trouvées dans le code)
1. **SMS Twilio** : dépendance installée (`twilio ^5.0.0`), aucun code d'envoi SMS dans le projet. Prévu dans la roadmap (notifications automatiques clients).
2. **Paiement Konnect** : mentionné dans `.env.local.example`, aucune route API ni SDK trouvé. Non implémenté.
3. **Sync transporteurs** : URLs de tracking configurées dans `constants.ts` mais aucune intégration API (IntiGo, Navex, etc.) pour récupérer les statuts automatiquement.
4. **SMS auto** : point 3 de la roadmap mémoire (après lien public et fiche client enrichie).
5. **Multi-users complet** : le build est en place mais la roadmap mémoire mentionne des migrations SQL à appliquer.
6. **Analytics avancés** : point 5 de la roadmap mémoire.

### Bugs connus / Limitations
- La page analytics n'est pas accessible aux opérateurs (redirect /orders) — comportement voulu.
- `readonly` ne peut pas accéder au catalogue `/catalog/[id]` (redirect /orders) — voulu.
- L'export analytics CSV passe par `/api/analytics/export` qui n'est pas documenté dans le code lu (fichier existant mais non lu entièrement).
- Le `order_count` sur la table customers semble calculé dynamiquement dans les queries, pas via trigger.

---

## 12. Commandes utiles

### Développement
```bash
# Depuis la racine du monorepo
npm run dev          # Lance tous les services (apps/web sur port 3000)
npm run build        # Build production
npm run lint         # ESLint
npm run type-check   # TypeScript --noEmit
npm run test         # Vitest

# Depuis apps/web uniquement
cd apps/web
npm run dev
next dev
```

### Variables d'environnement requises (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optionnels :
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
INTIGO_API_KEY=
NAVEX_API_KEY=
KONNECT_API_KEY=
```

### Migrations Supabase
```bash
# Via Supabase CLI (si configuré)
npx supabase db push

# Ou appliquer manuellement dans l'ordre dans le Dashboard Supabase SQL Editor
# Voir section 4 — Ordre des migrations
```

### Build & Deploy
```bash
npm run build        # Vérifie la compilation
# Deploy sur Vercel ou autre plateforme compatible Next.js 15
# Variables d'env à configurer dans la plateforme de déploiement
```

---

*Généré le 2026-06-05 — Lecture complète de apps/web/ et supabase/migrations/*
