# Migrations Hanut

## Ordre d'application

Les migrations sont appliquées dans l'ordre alphabétique des noms de fichiers (format `YYYYMMDD_`).
Le CI les applique via `migrations.yml` (job `check-migrations`).

## Comment ajouter une migration

1. Nommer le fichier : `YYYYMMDD_description_courte.sql`
2. Utiliser `CREATE OR REPLACE` pour les fonctions
3. Utiliser `IF NOT EXISTS` pour les tables et index
4. Tester l'idempotence : la migration doit pouvoir être rejouée sans erreur
5. Ajouter `SECURITY DEFINER SET search_path = public` à toutes les fonctions exposées

## Fonctions redéfinies plusieurs fois

### `create_order_with_stock`

Redéfinie dans l'ordre chronologique :

| Fichier | Params | Statut |
|---|---|---|
| `20260601_create_order_with_stock_rpc.sql` | 12 | ⚠️ DÉPRÉCIÉ |
| `20260608_fix_variant_stock_decrement.sql` | 12 | ⚠️ DÉPRÉCIÉ |
| `20260608_tracking_token.sql` | 12 | ⚠️ DÉPRÉCIÉ |
| `20260609_fix_tracking_token_rpc.sql` | 12 | ⚠️ DÉPRÉCIÉ |
| `20260609_stock_variant_consistency.sql` | 13 | ⚠️ DÉPRÉCIÉ |
| `20260610_consolidate_order_rpc.sql` | 13 | consolidation |
| `20260610_add_order_unit_cost.sql` | 13 | ⚠️ DÉPRÉCIÉ (section RPC uniquement) |
| `20260620_secure_order_rpc.sql` | 13 | ✅ VERSION FINALE |

La version finale est dans `20260620_secure_order_rpc.sql` :
- 13 paramètres dont `p_changed_by`
- `SECURITY DEFINER SET search_path = public`
- Garde `can_write_seller` + bypass service_role
- Restreint la création aux statuts `pending` / `new`
- Écrit dans `order_status_history`

### `update_order_status`

| Fichier | Statut |
|---|---|
| `20260613_add_update_order_status_rpc.sql` | version initiale |
| `20260622_add_status_transitions.sql` | ✅ VERSION FINALE — ajoute vérification `order_status_transitions` |

### `create_delivery_from_order` / `mark_delivery_cod_collected`

| Fichier | Statut |
|---|---|
| `20260609_delivery_workflow_rpcs.sql` | version initiale |
| `20260621_secure_delivery_rpcs.sql` | ✅ VERSION FINALE — ajoute `can_write_seller` + `v_actor` |

### `mark_delivery_cod_reversed` (nouveau)

| Fichier | Statut |
|---|---|
| `20260623_add_cod_reversal_history.sql` | ✅ VERSION FINALE |

## Autres fonctions notables

| Fonction | Fichier |
|---|---|
| `set_seller_jwt_claims` (Auth Hook) | `20260616_add_jwt_claims_hook.sql` |
| `adjust_product_stock` | `20260614_add_adjust_stock_rpc.sql` |
| `cancel_order_with_stock` | `20260619_extend_cancel_order.sql` |
| `soft_delete_order_with_stock` | `20260612_allow_delete_cancelled_order.sql` |
| `get_analytics_summary` | `20260612_add_analytics_rpc.sql` |
| `get_analytics_export` | `20260625_add_analytics_export_rpc.sql` |

## Correctifs de cohérence récents

| Fichier | Rôle |
|---|---|
| `20260624_fix_double_order_count_trigger.sql` | Supprime le trigger historique qui doublait `customers.order_count` |
| `20260625_add_analytics_export_rpc.sql` | Agrège l'export analytics par jour avec contrôle d'accès et période bornée |
| `20260626_restore_api_role_privileges.sql` | Restaure les privilèges SQL PostgREST; la RLS reste l'autorisation par ligne |
| `20260627_fix_service_role_detection.sql` | Compatibilité du rôle serveur avec les formats de claims PostgREST récents et historiques |

## Note sur schema.sql

`schema.sql` est le schéma initial appliqué avant toutes les migrations.
Il contient des divergences documentées en en-tête de fichier.
Ne jamais éditer `schema.sql` directement — utiliser les migrations.

Pour régénérer depuis la DB de production :
```sh
npx supabase db dump --schema public > supabase/schema.sql
```
