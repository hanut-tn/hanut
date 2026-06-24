# Rôles d'équipe — Comportement et sécurité

## Rôles disponibles

| Rôle | Permissions |
|---|---|
| `admin` | Lecture + écriture + suppression + gestion équipe |
| `operator` | Lecture + écriture (commandes, livraisons, catalogue) |
| `readonly` | Lecture uniquement |

## Suspension et downgrade

### Ce qui se passe en base (immédiat)

Quand un vendeur passe de Pro à Starter, ou retire manuellement un membre :

1. Le trigger `trg_handle_plan_team_access` (migration `20260708_team_cleanup_on_downgrade.sql`)
   passe `team_members.status = 'suspended'` pour tous les membres non-admin.
2. La fonction `get_seller_id()` filtre sur `status = 'active'` — un membre suspendu reçoit
   `NULL` depuis cette fonction.
3. Toutes les policies RLS utilisent `seller_id = get_seller_id()` — avec `NULL`, aucune ligne
   n'est accessible. **L'accès aux données est coupé immédiatement, en base.**

### Fenêtre résiduelle (sessions JWT actives)

Les JWT Supabase ont une durée de vie d'environ **1 heure**. Un membre dont le statut vient d'être
suspendu peut encore :

- **Naviguer** vers les pages dashboard (le middleware ne vérifie que `subscription_end`, pas
  `team_members.status`).
- **Voir des pages vides** : toutes les requêtes DB retournent 0 résultat (RLS bloque via
  `get_seller_id() = NULL`).
- **Échouer sur toute mutation** : les RPCs (`create_order_with_stock`, `create_delivery_from_order`,
  etc.) vérifient aussi `can_write_seller()` ou `get_team_role()`, qui retournent NULL pour un
  membre suspendu.

**Conclusion : la fenêtre d'1h est cosmétique.** Un membre suspendu voit des pages vides et
ne peut rien faire. Il n'y a pas d'accès aux données ni de mutation possible.

### Décision v1

Ce comportement est **accepté pour la v1**. La révocation immédiate des JWT (via
`supabase.auth.admin.signOut(userId)`) n'est pas implémentée car elle ajoute une complexité
significative (appel admin à chaque downgrade) pour un bénéfice purement cosmétique (empêcher
les redirections vers des pages vides pendant 1h).

Si le besoin évolue (ex : accès à des données sensibles non couvertes par RLS), implémenter
la révocation active via l'API Admin Supabase dans le trigger PostgreSQL (via `pg_net` +
`supabase.functions.invoke`) ou dans une Edge Function déclenchée par le downgrade.

## Test de la suspension

```sql
-- Vérifier que get_seller_id() retourne NULL pour un membre suspendu
UPDATE team_members SET status = 'suspended' WHERE user_id = '<uuid>';
-- Puis tester via l'API client avec le JWT de ce membre — devrait retourner 0 résultats
```
