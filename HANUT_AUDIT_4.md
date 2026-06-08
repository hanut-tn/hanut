# HANUT_AUDIT_4.md

Audit complet de Hanut au 08 juin 2026.

Projet audité : SaaS Hanut pour vendeurs tunisiens WhatsApp / Instagram.

Stack observé : Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, Supabase Auth / Postgres / Storage, Turborepo npm workspaces, Vitest, ESLint.

Vérifications exécutées :

- `npm run type-check --workspace @hanut/web` : OK
- `npm run test --workspace @hanut/web` : OK, 8 fichiers, 41 tests passés
- `npm run lint --workspace @hanut/web` : OK
- `npm run build --workspace @hanut/web` : OK, Next.js build production réussi

Statut global : l'application est déjà solide pour une bêta privée, mais pas encore au niveau "premiers vrais clients sans surveillance". Les risques restants sont surtout métier : stock par variante, actions COD bulk, mutations non transactionnelles et quelques incohérences marketing / paiement.

---

## 1. Auth / sécurité

✅ Fonctionne parfaitement

- Le middleware protège bien le dashboard et laisse passer les routes publiques : `apps/web/middleware.ts:5`, `apps/web/middleware.ts:37`, `apps/web/middleware.ts:69`.
- La callback auth protège contre les redirects externes avec `startsWith('/')` et `!startsWith('//')` : `apps/web/app/api/auth/callback/route.ts:24`.
- Changement de mot de passe depuis les paramètres avec vérification du mot de passe actuel : `apps/web/components/settings/SettingsClient.tsx:222`, `apps/web/components/settings/SettingsClient.tsx:242`.
- Rate limit sur commandes publiques, waitlist, contact et tracking : `apps/web/app/api/orders/public/route.ts:26`, `apps/web/app/api/waitlist/route.ts:10`, `apps/web/app/api/contact/route.ts:10`, `apps/web/app/api/track/[orderId]/route.ts:10`.

⚠️ Présent mais incomplet / buggy

- Suppression de compte non transactionnelle : les tables sont supprimées une par une puis l'utilisateur Auth est supprimé à la fin. Si `deleteUser` échoue, les données vendeur sont déjà supprimées mais le compte Auth reste actif. Voir `apps/web/app/api/account/route.ts:62`, `apps/web/app/api/account/route.ts:93`, `apps/web/app/api/account/route.ts:97`.
- Route `POST /api/activity` accepte des logs envoyés par tout utilisateur authentifié et permet de fournir `description`, `action_type`, `metadata` côté client. Elle n'est pas utilisée directement par l'UI mais reste exposée : `apps/web/app/api/activity/route.ts:45`, `apps/web/app/api/activity/route.ts:52`.
- Inscription : le profil seller est créé avant confirmation email, ce qui peut réserver des slugs / comptes non vérifiés si l'utilisateur abandonne : `apps/web/app/(auth)/register/page.tsx:53`.
- Reset password public : la page `/reset-password` peut mettre à jour le mot de passe de n'importe quelle session active sans mot de passe actuel. Fonctionnel pour recovery, mais à isoler mieux par contexte de recovery : `apps/web/app/(auth)/reset-password/page.tsx:33`.

❌ Manquant

- Pas de transaction SQL / RPC atomique pour suppression complète de compte.
- Pas de vraie journalisation d'erreur serveur sur les suppressions partielles ou mutations critiques.

💡 Priorité

Créer une RPC Supabase `delete_seller_account(p_seller_id)` ou déplacer la suppression dans une procédure transactionnelle côté DB, puis supprimer Auth uniquement si la transaction DB a réussi. Restreindre ou retirer `POST /api/activity`.

Score : 7/10

---

## 2. Onboarding

✅ Fonctionne parfaitement

- Checklist serveur + client avec étapes produit, lien copié, première commande : `apps/web/app/(dashboard)/dashboard/page.tsx:141`, `apps/web/components/dashboard/OnboardingChecklist.tsx:144`.
- L'étape "Voir mes commandes" marque maintenant `first_order` immédiatement et cache le composant localement avant navigation : `apps/web/components/dashboard/OnboardingChecklist.tsx:80`, `apps/web/components/dashboard/OnboardingChecklist.tsx:82`.
- API onboarding revalide dashboard et cache tag : `apps/web/app/api/onboarding/route.ts:45`, `apps/web/app/api/onboarding/route.ts:60`.

⚠️ Présent mais incomplet / buggy

- `Ignorer pour l'instant` est stocké en `sessionStorage`, donc la checklist réapparaît à la session suivante. C'est voulu dans l'ancien design, mais peut créer de la confusion pour un vrai vendeur : `apps/web/components/dashboard/OnboardingChecklist.tsx:26`, `apps/web/components/dashboard/OnboardingChecklist.tsx:99`.
- La checklist contient encore des emojis visibles alors que le design dashboard avait été nettoyé : `apps/web/components/dashboard/OnboardingChecklist.tsx:110`, `apps/web/components/dashboard/OnboardingChecklist.tsx:149`.
- Le `PATCH complete` est déclenché après 3 secondes, donc selon navigation / cache, le serveur peut encore renvoyer la checklist brièvement : `apps/web/components/dashboard/OnboardingChecklist.tsx:48`.

❌ Manquant

- Pas d'état DB `onboarding_dismissed` ou `onboarding_hidden_until`.

💡 Priorité

Persister aussi le masquage onboarding côté DB et passer `onboarding_completed=true` dès que la dernière étape est cliquée, pas après un délai UI.

Score : 8/10

---

## 3. Dashboard

✅ Fonctionne parfaitement

- Dashboard admin avec cache court et tags de revalidation : `apps/web/app/(dashboard)/dashboard/page.tsx:29`, `apps/web/app/(dashboard)/dashboard/page.tsx:65`.
- Dashboards operator et readonly séparés, sans données financières pour operator : `apps/web/components/dashboard/OperatorDashboard.tsx:26`, `apps/web/components/dashboard/ReadonlyDashboard.tsx:82`.
- LowStockWidget intégré au-dessus des commandes récentes : `apps/web/app/(dashboard)/dashboard/page.tsx:289`.
- Badge commandes pending/new disponible via API dédiée : `apps/web/app/api/orders/pending-count/route.ts:10`.

⚠️ Présent mais incomplet / buggy

- Le cache dashboard utilise `createServiceClient`, donc il bypass RLS. Les filtres `sellerId` existent, mais la sécurité dépend entièrement du code : `apps/web/app/(dashboard)/dashboard/page.tsx:30`, `apps/web/lib/supabase/service.ts:11`.
- Les titres dashboard restent `text-2xl` sans version mobile `text-xl sm:text-2xl` sur plusieurs dashboards : `apps/web/app/(dashboard)/dashboard/page.tsx:135`, `apps/web/components/dashboard/OperatorDashboard.tsx:81`, `apps/web/components/dashboard/ReadonlyDashboard.tsx:93`.

❌ Manquant

- Pas de skeleton riche par section, seulement loading global.

💡 Priorité

Garder le cache mais limiter les queries service role aux vrais besoins. Harmoniser les titres dashboard mobiles.

Score : 8/10

---

## 4. Commandes

✅ Fonctionne parfaitement

- Pagination serveur initiale, compteurs exacts et corbeille admin : `apps/web/app/(dashboard)/orders/page.tsx:15`, `apps/web/app/(dashboard)/orders/page.tsx:36`.
- Recherche API avec debounce et `AbortController` côté client : `apps/web/components/orders/OrdersClient.tsx:286`.
- Filtre date client + pagination serveur via `since` / `until` : `apps/web/components/orders/OrdersClient.tsx:638`, `apps/web/app/api/orders/list/route.ts:33`.
- Dual-layout mobile cards + table desktop : `apps/web/components/orders/OrdersClient.tsx:811`, `apps/web/components/orders/OrdersClient.tsx:930`.
- Suppression / restauration / suppression définitive optimistes avec rollback : `apps/web/components/orders/OrdersClient.tsx:470`, `apps/web/components/orders/OrdersClient.tsx:502`, `apps/web/components/orders/OrdersClient.tsx:565`.

⚠️ Présent mais incomplet / buggy

- Les changements de statut optimistes n'ont pas de rollback en cas d'erreur serveur. Le toast succès s'affiche avant confirmation DB : `apps/web/components/orders/OrdersClient.tsx:451`, `apps/web/components/orders/OrdersClient.tsx:455`, `apps/web/components/orders/OrdersClient.tsx:464`.
- Restauration de stock ignorée si l'`update products` échoue lors de l'annulation ou de la mise en corbeille : `apps/web/app/(dashboard)/orders/actions.ts:161`, `apps/web/app/(dashboard)/orders/actions.ts:252`.
- Les inputs de recherche / filtre date sur commandes restent `text-sm`, donc iOS peut zoomer : `apps/web/components/orders/OrdersClient.tsx:623`, `apps/web/components/orders/OrdersClient.tsx:643`.

❌ Manquant

- Pas d'historique complet fiable pour chaque transition si l'insert `order_status_history` échoue, car l'erreur d'historique n'est pas bloquante : `apps/web/app/(dashboard)/orders/actions.ts:173`.

💡 Priorité

Mettre les mutations statut dans un wrapper avec rollback client + message d'erreur. Transformer changement statut + historique + stock en RPC transactionnelle.

Score : 7.5/10

---

## 5. Catalogue

✅ Fonctionne parfaitement

- Upload image avec whitelist MIME + extension côté serveur : `apps/web/app/(dashboard)/catalog/actions.ts:156`.
- Validation client SVG / formats interdits avant preview : `apps/web/components/catalog/ProductModal.tsx:50`, `apps/web/components/catalog/ProductModal.tsx:57`.
- Modal produit mobile plein écran avec header/footer sticky : `apps/web/components/catalog/ProductModal.tsx:128`, `apps/web/components/catalog/ProductModal.tsx:378`.
- Vue grille, vue liste mobile cards, table desktop : `apps/web/components/catalog/CatalogClient.tsx:593`, `apps/web/components/catalog/CatalogClient.tsx:606`, `apps/web/components/catalog/CatalogClient.tsx:618`.
- Réapprovisionnement planifié, CMP et synchronisation stock/variantes présents : `apps/web/app/(dashboard)/catalog/restock-actions.ts:26`, `apps/web/app/(dashboard)/catalog/restock-actions.ts:93`, `apps/web/app/(dashboard)/catalog/restock-actions.ts:236`.

⚠️ Présent mais incomplet / buggy

- Vue grille catalogue est `grid-cols-2` sur mobile alors que l'audit responsive demandait `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Deux cards par ligne sur iPhone peut serrer les prix / badges : `apps/web/components/catalog/CatalogClient.tsx:593`.
- La fonction `sync_product_stock` est `SECURITY DEFINER` et appelle `get_seller_id()` / `can_write_seller()`. Correct en intention, mais à tester en DB car les fonctions auth/RLS sous `SECURITY DEFINER` peuvent se comporter différemment selon le `search_path` et les droits : `supabase/migrations/20260606_restock_orders.sql:43`, `supabase/migrations/20260606_restock_orders.sql:80`.
- Certains boutons d'ajustement stock utilisent encore des caractères `✓`, `✗`, `⚠️` au lieu de Lucide : `apps/web/components/catalog/ProductDetailClient.tsx:470`, `apps/web/components/catalog/ProductDetailClient.tsx:537`, `apps/web/components/catalog/ProductDetailClient.tsx:549`.

❌ Manquant

- Le stock par variante n'est pas décrémenté au moment de la commande. Voir section "Lien public" pour le bug critique.

💡 Priorité

Ajouter une RPC transactionnelle qui décrémente aussi `products.variants[*].qty` quand une variante est commandée, puis synchronise `products.stock`.

Score : 7/10

---

## 6. Clients

✅ Fonctionne parfaitement

- Pagination initiale serveur avec `count: exact` : `apps/web/app/(dashboard)/customers/page.tsx:14`.
- Filtre tag + recherche + tri client-side : `apps/web/components/customers/CustomersClient.tsx:170`, `apps/web/components/customers/CustomersClient.tsx:176`.
- Cards mobiles pour la liste clients : `apps/web/components/customers/CustomersClient.tsx:60`, `apps/web/components/customers/CustomersClient.tsx:383`.
- Fiche client avec stats, tags, notes, historique mobile cards : `apps/web/components/customers/CustomerDetail.tsx:245`, `apps/web/components/customers/CustomerDetail.tsx:260`, `apps/web/components/customers/CustomerDetail.tsx:373`.
- Suppression client bloquée proprement si commandes actives ou corbeille : `apps/web/app/(dashboard)/customers/actions.ts:67`, `apps/web/app/(dashboard)/customers/actions.ts:81`.

⚠️ Présent mais incomplet / buggy

- Tri, stats par client et filtre tag se font sur les clients chargés localement. Si tous les clients ne sont pas chargés, "CA le plus élevé" et tags peuvent être incomplets : `apps/web/components/customers/CustomersClient.tsx:176`, `apps/web/components/customers/CustomersClient.tsx:204`.
- API list trie toujours par nom et ignore le `sortBy` pourtant mentionné dans le récap précédent : `apps/web/app/api/customers/list/route.ts:27`.
- Modales client ont header sticky, mais pas toujours bouton X visible dans le header : `apps/web/components/customers/CustomersClient.tsx:520`, `apps/web/components/customers/CustomerDetail.tsx:462`.

❌ Manquant

- Pas de recherche serveur branchée pour la page clients principale, contrairement aux commandes.

💡 Priorité

Déplacer tri/recherche/tag dans `/api/customers/list` avec paramètres `sortBy`, `tag`, `search`, puis paginer sur le résultat complet.

Score : 7.5/10

---

## 7. Livraisons

✅ Fonctionne parfaitement

- Page deliveries dual-layout, mobile cards et table desktop : `apps/web/components/deliveries/DeliveriesClient.tsx:493`, `apps/web/components/deliveries/DeliveriesClient.tsx:510`.
- Liens tracking cliquables mobile et desktop : `apps/web/components/deliveries/DeliveriesClient.tsx:128`, `apps/web/components/deliveries/DeliveriesClient.tsx:584`.
- Modales mobile plein écran avec header/footer sticky : `apps/web/components/deliveries/DeliveriesClient.tsx:695`, `apps/web/components/deliveries/DeliveriesClient.tsx:764`.
- Suppression bloquée si COD collecté : `apps/web/app/(dashboard)/deliveries/actions.ts:98`.

⚠️ Présent mais incomplet / buggy

- Bulk `cod_reversed` marque aussi `cod_collected=true` pour toute livraison non reversée, même si elle n'était pas collectée. Cela peut créer une trace comptable fausse : `apps/web/app/api/deliveries/bulk/route.ts:53`, `apps/web/app/api/deliveries/bulk/route.ts:62`.
- Le toggle individuel `handleToggle` n'a pas rollback ni toast erreur si `updateDelivery` échoue : `apps/web/components/deliveries/DeliveriesClient.tsx:303`.
- Les badges COD mobile ont `min-h-[36px]`, sous la cible tactile 44px demandée : `apps/web/components/deliveries/DeliveriesClient.tsx:151`, `apps/web/components/deliveries/DeliveriesClient.tsx:163`.

❌ Manquant

- Pas de log activité pour bulk COD.
- Pas d'historique comptable COD séparé.

💡 Priorité

Pour bulk `cod_reversed`, filtrer uniquement `cod_collected=true AND cod_reversed=false`; les non collectées doivent être `skipped` avec raison.

Score : 7/10

---

## 8. Analytiques

✅ Fonctionne parfaitement

- Périodes 7/30/90, comparaison période précédente et période custom Business : `apps/web/components/analytics/AnalyticsClient.tsx:56`, `apps/web/components/analytics/AnalyticsClient.tsx:85`, `apps/web/components/analytics/AnalyticsClient.tsx:108`.
- Export CSV Pro/Business protégé côté client et serveur : `apps/web/components/analytics/AnalyticsClient.tsx:190`, `apps/web/app/api/analytics/export/route.ts:14`.
- Liens clients vers fiches clients : `apps/web/components/analytics/AnalyticsClient.tsx:683`.
- Filtres transporteurs et table overflow : `apps/web/components/analytics/AnalyticsClient.tsx:593`, `apps/web/components/analytics/AnalyticsClient.tsx:622`.

⚠️ Présent mais incomplet / buggy

- `prevProfit` ne déduit pas les frais de livraison de la période précédente. La variation de profit est donc approximative : `apps/web/components/analytics/AnalyticsClient.tsx:175`.
- Export CSV ignore la période custom. Il exporte seulement `period=7/30/90`, même si Business choisit une plage personnalisée : `apps/web/components/analytics/AnalyticsClient.tsx:194`.
- Le popover custom est `absolute right-0 w-72`; sur petits écrans il peut toucher les bords si le bouton est près du bord : `apps/web/components/analytics/AnalyticsClient.tsx:354`.

❌ Manquant

- Pas de filtrage date côté export custom `from` / `to`.

💡 Priorité

Modifier l'API export pour accepter `from` et `to`, puis recalculer les frais sur la période précédente pour afficher une variation profit correcte.

Score : 8/10

---

## 9. Paramètres

✅ Fonctionne parfaitement

- Tabs scrollables avec hauteur tactile : `apps/web/components/settings/SettingsClient.tsx:372`.
- Changement email avec état pending et annulation : `apps/web/components/settings/SettingsClient.tsx:198`, `apps/web/components/settings/SettingsClient.tsx:213`.
- Changement password avec re-auth : `apps/web/components/settings/SettingsClient.tsx:242`.
- Flux upgrade WhatsApp avec modale de confirmation : `apps/web/components/settings/SettingsClient.tsx:832`, `apps/web/components/settings/SettingsClient.tsx:893`.

⚠️ Présent mais incomplet / buggy

- Le numéro WhatsApp est encore un placeholder, donc les boutons upgrade ouvrent un mauvais destinataire : `apps/web/components/settings/SettingsClient.tsx:65`.
- Le titre `Paramètres` reste `text-2xl`, pas `text-xl sm:text-2xl` : `apps/web/components/settings/SettingsClient.tsx:341`.
- Le bouton upgrade a été amélioré mais il contient deux lignes; sur largeur très étroite, vérifier que `whitespace-nowrap` ne pousse pas le contenu : `apps/web/components/settings/SettingsClient.tsx:843`.

❌ Manquant

- Pas de vraie activation de plan après paiement, ni trace d'intention d'upgrade en DB.

💡 Priorité

Remplacer le placeholder par le vrai numéro et créer une table `upgrade_requests` pour tracer le clic / plan demandé avant redirection WhatsApp.

Score : 8/10

---

## 10. Équipe

✅ Fonctionne parfaitement

- Accès réservé admin Business : `apps/web/app/(dashboard)/team/page.tsx:9`, `apps/web/app/(dashboard)/team/page.tsx:10`.
- Limite `MAX_MEMBERS = 5` côté UI et API : `apps/web/components/team/TeamPageClient.tsx:7`, `apps/web/app/api/team/route.ts:14`, `apps/web/app/api/team/route.ts:76`.
- Invitations expirables et resend : `apps/web/app/api/team/route.ts:104`, `apps/web/app/api/team/[memberId]/resend/route.ts:51`.
- Cards mobiles équipe et journal paginé : `apps/web/components/team/TeamPageClient.tsx:285`, `apps/web/components/team/TeamPageClient.tsx:590`.

⚠️ Présent mais incomplet / buggy

- Les bannières invitation pending contiennent encore `🔴` et `⚠️`, hors langage visuel lucide : `apps/web/components/team/TeamPageClient.tsx:345`, `apps/web/components/team/TeamPageClient.tsx:450`.
- La route PATCH accepte `admin` comme rôle, mais l'UI ne propose que operator/readonly. Ce décalage peut permettre de promouvoir un membre en admin via requête manuelle : `apps/web/app/api/team/[memberId]/route.ts:20`.
- `logActivity` dans resend n'a pas `userName`, donc il dépend du resolve silencieux : `apps/web/app/api/team/[memberId]/resend/route.ts:66`.

❌ Manquant

- Pas d'envoi d'email applicatif custom en plus de l'invitation Supabase.

💡 Priorité

Interdire `admin` dans PATCH tant que l'UI et le modèle de responsabilités ne le supportent pas explicitement.

Score : 8/10

---

## 11. Lien public `/order/[slug]`

✅ Fonctionne parfaitement

- Formulaire mobile-first avec inputs `text-base`, boutons 44px, padding correct : `apps/web/components/order/OrderForm.tsx:250`, `apps/web/components/order/OrderForm.tsx:487`.
- Produit sélectionné affiché avec image / placeholder : `apps/web/components/order/OrderForm.tsx:333`.
- Validation téléphone / quantité / appartenance produit côté serveur : `apps/web/app/api/orders/public/route.ts:65`, `apps/web/app/api/orders/public/route.ts:84`, `apps/web/app/api/orders/public/route.ts:116`.
- Confirmation avec lien de suivi et copier lien : `apps/web/components/order/OrderForm.tsx:198`.

⚠️ Présent mais incomplet / buggy

- Bug critique : la validation variante existe avant l'appel RPC, mais la RPC décrémente uniquement `products.stock`, jamais `products.variants`. Le stock affiché par variante devient faux et peut provoquer de la survente d'une variante précise : `apps/web/app/api/orders/public/route.ts:96`, `supabase/migrations/20260601_create_order_with_stock_rpc.sql:173`.
- La recherche variante serveur construit le label avec `[size, color].join(' / ')`; si une variante sans taille/couleur utilise le fallback côté UI `Variante 1`, elle ne matchera pas côté serveur : `apps/web/components/order/OrderForm.tsx:25`, `apps/web/app/api/orders/public/route.ts:103`.
- Page indisponible / boutique introuvable utilise encore des emojis : `apps/web/app/order/[slug]/page.tsx:17`, `apps/web/app/order/[slug]/page.tsx:33`.

❌ Manquant

- Pas de token anti-CSRF / honeypot anti-bot côté formulaire public, seulement rate-limit IP.

💡 Priorité

Corriger `create_order_with_stock` pour verrouiller le produit, vérifier la variante et décrémenter la quantité de la variante dans le JSONB de manière atomique.

Score : 6.5/10

---

## 12. Page tracking `/track/[orderId]`

✅ Fonctionne parfaitement

- Page server + client polling 30 secondes : `apps/web/app/track/[orderId]/page.tsx:76`, `apps/web/components/track/TrackingClient.tsx:101`.
- API tracking rate-limitée : `apps/web/app/api/track/[orderId]/route.ts:10`.
- `robots: noindex` présent : `apps/web/app/track/[orderId]/page.tsx:8`.
- Le lien tracking transporteur est généré depuis les constantes : `apps/web/components/track/TrackingClient.tsx:137`.

⚠️ Présent mais incomplet / buggy

- Le suivi est public via UUID complet. C'est peu devinable, mais toute personne avec le lien voit produit, montant COD, prénom et ville : `apps/web/app/api/track/[orderId]/route.ts:59`.
- Le bouton "Actualiser" est plus petit que 44px, donc moins confortable mobile : `apps/web/components/track/TrackingClient.tsx:281`.
- Les statuts `pending` et `new` se chevauchent dans la timeline : `getStepIndex('pending')` retourne 0 et `new` est aussi première étape : `apps/web/components/track/TrackingClient.tsx:23`, `apps/web/components/track/TrackingClient.tsx:127`.

❌ Manquant

- Pas de token public dédié du type `tracking_token`; l'UUID de commande sert de secret.

💡 Priorité

Ajouter `tracking_token` aléatoire et garder l'UUID interne hors URL publique.

Score : 8/10

---

## 13. Marketing

✅ Fonctionne parfaitement

- Homepage server component avec metadata complète : `apps/web/app/page.tsx:210`.
- Waitlist intégrée sans convertir toute la homepage en client component : `apps/web/app/page.tsx:309`, `apps/web/components/marketing/WaitlistForm.tsx:1`.
- Navbar Contact présent : `apps/web/components/marketing/Navbar.tsx:7`.
- Footer social avec vraies URLs et attributs sécurité : `apps/web/components/marketing/Footer.tsx:76`.
- Pricing Pro/Business en WhatsApp : `apps/web/app/(marketing)/pricing/page.tsx:205`.

⚠️ Présent mais incomplet / buggy

- Numéro WhatsApp pricing encore placeholder : `apps/web/app/(marketing)/pricing/page.tsx:110`.
- FAQ pricing dit encore paiement par virement, carte ou mobile money et facture automatique, ce qui contredit le flux manuel actuel : `apps/web/app/(marketing)/pricing/page.tsx:97`.
- Footer légal a encore `href="#"` pour CGU et Confidentialité : `apps/web/components/marketing/Footer.tsx:32`.
- Le contenu marketing promet encore SMS / suivi automatique alors que le flux actuel a remplacé la promesse SMS sur la commande publique : `apps/web/app/page.tsx:29`, `apps/web/app/page.tsx:349`.

❌ Manquant

- Pages légales réelles.

💡 Priorité

Mettre à jour pricing/FAQ/footer avant acquisition publique, sinon risque de promesse commerciale incohérente.

Score : 7.5/10

---

## 14. Mobile / responsive

✅ Fonctionne parfaitement

- Layout dashboard cache la sidebar desktop sur mobile et ajoute bottom nav : `apps/web/app/(dashboard)/layout.tsx:76`, `apps/web/app/(dashboard)/layout.tsx:92`.
- Padding bas du contenu avec safe-area : `apps/web/app/(dashboard)/layout.tsx:86`.
- MobileSidebar overlay gauche : `apps/web/components/dashboard/MobileSidebar.tsx:52`, `apps/web/components/dashboard/MobileSidebar.tsx:67`.
- BottomNav + sheet Plus : `apps/web/components/dashboard/BottomNav.tsx:71`, `apps/web/components/dashboard/BottomNav.tsx:124`.
- Classe `.input` globale en `text-base md:text-sm`, bonne pour iOS : `apps/web/app/globals.css:33`.

⚠️ Présent mais incomplet / buggy

- TopBar affiche toujours `Menu`, jamais `X` quand le drawer est ouvert, contrairement à la spec : `apps/web/components/dashboard/TopBar.tsx:4`, `apps/web/components/dashboard/TopBar.tsx:38`.
- BottomNav utilise `h-14` alors que la spec demandait `h-16` : `apps/web/components/dashboard/BottomNav.tsx:137`, `apps/web/components/dashboard/BottomNav.tsx:162`.
- Certains titres restent `text-2xl` sans breakpoint mobile : `apps/web/components/deliveries/DeliveriesClient.tsx:372`, `apps/web/components/team/TeamPageClient.tsx:245`, `apps/web/components/orders/OrdersClient.tsx:604`.
- Plusieurs petits boutons restent sous 44px dans les tables ou badges, ce qui est acceptable desktop mais parfois présent dans mobile cards livraisons : `apps/web/components/deliveries/DeliveriesClient.tsx:151`.

❌ Manquant

- Pas de tests visuels automatisés mobile.

💡 Priorité

Ajouter une passe Playwright mobile iPhone pour dashboard, orders, settings, catalog, public order et tracking. Corriger `TopBar` Menu/X et `h-16`.

Score : 8/10

---

## 15. Design global

✅ Fonctionne parfaitement

- Palette cohérente autour du vert Hanut, blanc, stone, amber/red pour alertes.
- Icônes Lucide largement utilisées : dashboard, analytics, deliveries, catalog, tracking.
- Cards, modales et états vides de plus en plus standardisés.

⚠️ Présent mais incomplet / buggy

- Il reste des emojis dans l'app dashboard / public : onboarding, équipe, page publique, product detail. Exemples : `apps/web/components/dashboard/OnboardingChecklist.tsx:149`, `apps/web/components/team/TeamPageClient.tsx:345`, `apps/web/app/order/[slug]/page.tsx:17`, `apps/web/components/catalog/ProductDetailClient.tsx:470`.
- Violet réintroduit pour Best Delivery alors que le projet avait supprimé violet/purple : `apps/web/lib/constants.ts:64`.
- Beaucoup de flèches / checks textuels `✓`, `→`, `✗` au lieu d'icônes, ce qui donne un rendu moins premium dans quelques zones : `apps/web/components/settings/SettingsClient.tsx:821`, `apps/web/components/catalog/ProductDetailClient.tsx:537`.

❌ Manquant

- Pas encore de vrai design token centralisé pour badges transporteurs, plans, actions et modales.

💡 Priorité

Finir le nettoyage visuel : zéro emoji en dashboard, composants `InlineFeedback`, `ConfirmModal`, `PlanUpgradeButton`, tokens couleurs transporteurs.

Score : 7.5/10

---

## 16. Architecture / performance

✅ Fonctionne parfaitement

- Build production OK avec First Load partagé 102 kB.
- TypeScript propre, lint propre, tests propres.
- `React.cache()` utilisé pour dédupliquer `getUserContext` dans une requête : `apps/web/lib/get-context.ts:20`.
- Supabase join generics lourds coupés avec `as unknown as` de façon ciblée pour éviter blocage TS : `apps/web/app/(dashboard)/analytics/page.tsx:43`.

⚠️ Présent mais incomplet / buggy

- Usage fréquent de `createServiceClient()` dans pages et APIs. C'est pratique mais demande une discipline stricte de filtrage `seller_id` : `apps/web/lib/supabase/service.ts:11`.
- Plusieurs mutations importantes ne sont pas transactionnelles : account delete, order status + history, delivery delete + order revert, restock receive + stock movement.
- `receiveRestockOrder` met à jour produit puis restock_order, avec rollback manuel incomplet si rollback échoue : `apps/web/app/(dashboard)/catalog/restock-actions.ts:152`, `apps/web/app/(dashboard)/catalog/restock-actions.ts:167`.
- `logActivity` avale toutes les erreurs silencieusement : `apps/web/lib/activity.ts:29`.

❌ Manquant

- Pas de migrations testées contre une vraie DB Supabase dans CI.
- Pas d'outillage E2E.

💡 Priorité

Centraliser les mutations multi-table en RPC transactionnelles et ajouter un job CI qui applique les migrations sur une DB temporaire.

Score : 7.5/10

---

## 17. Fluidité / bugs UX

✅ Fonctionne parfaitement

- Beaucoup d'actions sont optimistes avec rollback : commandes delete/restore, clients delete, produits delete, livraisons delete.
- Toasts cohérents et positionnés au-dessus de la bottom nav : `apps/web/components/orders/OrdersClient.tsx:1255`, `apps/web/components/customers/CustomersClient.tsx:513`, `apps/web/components/catalog/CatalogClient.tsx:801`.
- Tracking poll + refresh manuel donne de la confiance client : `apps/web/components/track/TrackingClient.tsx:65`.

⚠️ Présent mais incomplet / buggy

- Optimisme sans rollback pour changements statut commandes : `apps/web/components/orders/OrdersClient.tsx:451`.
- Optimisme / action silencieuse pour toggles livraisons : `apps/web/components/deliveries/DeliveriesClient.tsx:303`.
- Onboarding peut encore réapparaître brièvement au retour dashboard si le cache serveur n'a pas encore reçu `complete` : `apps/web/components/dashboard/OnboardingChecklist.tsx:48`.
- Waitlist ne montre pas le détail d'erreur serveur, seulement "Erreur" : `apps/web/components/marketing/WaitlistForm.tsx:21`.

❌ Manquant

- Pas de système global de toast / mutations avec rollback partagé.

💡 Priorité

Créer un helper `runOptimisticAction({ apply, rollback, action, success, error })` ou un petit hook local pour standardiser les mutations à risque.

Score : 7.5/10

---

# Tableau récapitulatif

| Section | Score | Statut |
|---|---:|---|
| Auth / sécurité | 7/10 | Bon, mais suppression compte non atomique |
| Onboarding | 8/10 | Fluide, mais masquage non persisté |
| Dashboard | 8/10 | Solide |
| Commandes | 7.5/10 | Bon UX, rollback statut à corriger |
| Catalogue | 7/10 | Bon, bloqué par stock variantes |
| Clients | 7.5/10 | Bon, pagination client-side limite le tri |
| Livraisons | 7/10 | Bon, bulk COD risqué |
| Analytiques | 8/10 | Bon, profit précédent / export custom à corriger |
| Paramètres | 8/10 | Bon, WhatsApp placeholder |
| Équipe | 8/10 | Bon, rôle admin API à verrouiller |
| Lien public | 6.5/10 | UX bonne, bug variante critique |
| Tracking | 8/10 | Bon, token dédié recommandé |
| Marketing | 7.5/10 | Bon, messages paiement incohérents |
| Mobile responsive | 8/10 | Bon, petites specs incomplètes |
| Design global | 7.5/10 | Cohérent, nettoyage visuel à finir |
| Architecture / performance | 7.5/10 | Build sain, transactions à renforcer |
| Fluidité / bugs UX | 7.5/10 | Beaucoup mieux, mutations à standardiser |

Score global : 7.6/10

---

# Top 5 bugs critiques

1. Stock variantes non décrémenté lors d'une commande
   - Fichiers : `apps/web/app/api/orders/public/route.ts:96`, `supabase/migrations/20260601_create_order_with_stock_rpc.sql:173`
   - Impact : survente possible d'une taille/couleur précise, stock public faux.
   - Correction : décrément JSONB `variants` atomiquement dans `create_order_with_stock`.

2. Bulk COD reversé peut marquer comme collectées des livraisons non collectées
   - Fichier : `apps/web/app/api/deliveries/bulk/route.ts:53`, `apps/web/app/api/deliveries/bulk/route.ts:62`
   - Impact : comptabilité fausse, COD reversé sans collecte réelle.
   - Correction : `cod_reversed` seulement si `cod_collected=true`; sinon skipped.

3. Suppression de compte non transactionnelle
   - Fichier : `apps/web/app/api/account/route.ts:62`, `apps/web/app/api/account/route.ts:97`
   - Impact : compte Auth actif avec données DB supprimées si erreur finale.
   - Correction : RPC transactionnelle côté DB + suppression Auth contrôlée.

4. Statuts commandes optimistes sans rollback
   - Fichier : `apps/web/components/orders/OrdersClient.tsx:451`
   - Impact : l'UI peut afficher "confirmée / expédiée / livrée" alors que le serveur a refusé.
   - Correction : capturer l'ancien statut, catch erreur, rollback et toast erreur.

5. Restauration stock ignorée si l'update produit échoue
   - Fichier : `apps/web/app/(dashboard)/orders/actions.ts:161`, `apps/web/app/(dashboard)/orders/actions.ts:252`
   - Impact : commande annulée/supprimée mais stock non restauré sans alerte.
   - Correction : vérifier `{ error }` sur l'update stock et bloquer la mutation si échec.

---

# Top 5 améliorations à fort impact

1. RPC stock complète
   - Une seule fonction DB pour créer commande, décrémenter produit + variante, créer historique statut et mouvement stock.

2. Paiement manuel cohérent
   - Remplacer `21600000000`, corriger FAQ pricing et créer `upgrade_requests`.

3. E2E mobile iPhone
   - Playwright sur dashboard, orders, settings, catalog, deliveries, order public, tracking.

4. Mutations transactionnelles
   - Statuts commandes, suppression compte, receive restock, livraison delete/revert order.

5. Nettoyage design final
   - Supprimer emojis dashboard/public, remplacer checks textuels par Lucide, harmoniser `h-16` bottom nav et titres mobiles.

---

# Verdict

Hanut est proche d'une bêta privée sérieuse. Le code compile, les tests passent, le build production passe, la navigation mobile existe et les workflows principaux sont déjà utilisables.

Pour des premiers vrais clients payants, je ne déploierais pas encore sans corriger au minimum :

- stock variantes dans la RPC de commande,
- bulk COD reversé,
- rollback des statuts commandes,
- suppression compte transactionnelle ou désactivation temporaire de la fonctionnalité,
- numéro WhatsApp réel + texte pricing cohérent.

Après ces corrections, Hanut peut raisonnablement accueillir un petit groupe pilote de vendeurs réels, avec monitoring manuel et feedback rapproché.
