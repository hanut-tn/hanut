# Conventions RPC — Hanut

Règles à suivre pour toute nouvelle RPC liée aux commandes, ou toute évolution d'une RPC existante.

---

## Règle fondamentale : ne jamais allonger la signature positionnelle

Les RPCs de création de commandes ont été redéfinies ~9 fois (`create_order_with_stock`, 12→19 paramètres positionnels). Chaque ajout :

- nécessite un `DROP FUNCTION IF EXISTS` avec la signature exacte avant le `CREATE OR REPLACE` ;
- casse tous les appels existants si l'ordre ou le nombre de paramètres change ;
- rend les migrations difficiles à rejouer et l'historique difficile à lire.

**Ne jamais ajouter un paramètre positionnel supplémentaire à une RPC existante.**

---

## Structure de signature recommandée

```
CREATE OR REPLACE FUNCTION ma_rpc(
  -- Paramètres structurellement stables (identité / données core)
  p_seller_id   UUID,
  p_items       JSONB,           -- tableau d'articles : toujours JSONB

  -- Un seul paramètre JSONB pour tout champ optionnel ou susceptible d'évoluer
  p_options     JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
```

### p_options — champs supportés (exemple order)

```jsonc
{
  "status":                "new",         // statut initial
  "notes":                 "...",
  "cod_amount":            "149.00",
  "customer_id":           "uuid",
  "customer_email":        "...",
  "customer_governorate":  "Tunis",
  "customer_city":         "...",
  "customer_delegation":   "...",
  "customer_address":      "...",
  "customer_landmark":     "...",
  "customer_postal_code":  "1001",
  "delivery_notes":        "..."
}
```

Extraction dans la RPC :

```sql
p_options->>'status'               -- TEXT
(p_options->>'cod_amount')::NUMERIC -- NUMERIC avec cast explicite
p_options->>'customer_governorate'  -- TEXT nullable
```

---

## Exemple concret : refactoriser create_order_with_stock

**Signature actuelle (à ne pas casser) — 19 paramètres positionnels :**

```sql
CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_seller_id, p_product_id, p_quantity,
  p_customer_name, p_customer_phone,
  p_customer_address, p_customer_city, p_customer_id,
  p_variant, p_cod_amount, p_notes, p_status, p_changed_by,
  p_customer_email, p_customer_governorate, p_customer_delegation,
  p_customer_landmark, p_customer_postal_code, p_delivery_notes
)
```

**Signature recommandée pour une nouvelle version v2 (nouvelle RPC, pas un remplacement) :**

```sql
CREATE OR REPLACE FUNCTION create_order_v2(
  p_seller_id UUID,
  p_items     JSONB,                       -- [{product_id, variant, quantity, unit_price?}]
  p_customer  JSONB,                       -- {name, phone} — requis
  p_options   JSONB DEFAULT '{}'::JSONB    -- tout le reste
)
RETURNS UUID
```

L'ancienne RPC reste disponible pour les appelants existants. La nouvelle RPC est utilisée par les nouveaux flux. Quand tous les appelants ont migré, la v1 peut être dépréciée (DROP dans une migration dédiée avec un commentaire explicite).

---

## Règles complémentaires

### SECURITY DEFINER + search_path

Toute RPC doit avoir :

```sql
SECURITY DEFINER
SET search_path = public
```

### Garde d'autorisation en tête de fonction

```sql
IF NOT is_service_role()
  AND NOT COALESCE(can_write_seller(p_seller_id), false)
THEN
  RAISE EXCEPTION 'UNAUTHORIZED';
END IF;
```

Utiliser `is_service_role()` (migration `20260627`) et non `current_setting('request.jwt.claim.role', true) <> 'service_role'` (ancienne forme).

### REVOKE / GRANT systématique

```sql
REVOKE ALL ON FUNCTION ma_rpc(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ma_rpc(...) TO authenticated, service_role;
-- ou TO service_role uniquement pour les helpers internes
```

### NOTIFY pgrst en fin de migration

```sql
NOTIFY pgrst, 'reload schema';
```

### Nommage des migrations

```
YYYYMMDD_description_courte.sql
```

Le `YYYYMMDD` doit être la date réelle d'écriture. Si deux migrations sont créées le même jour, suffixer avec `_b`, `_c`, ou utiliser un intitulé différent.

### Ne jamais déplacer ni supprimer une migration, même dépréciée

`supabase-migrations.test.ts` référence chaque fichier de migration **par son chemin exact** (`migration('20260601_create_order_with_stock_rpc.sql')`). Déplacer un fichier (p.ex. vers `_deprecated/`) casse immédiatement les tests.

De plus, Supabase CLI applique les migrations **dans l'ordre alphabétique/chronologique depuis le dossier `supabase/migrations/`**. Un fichier déplacé hors du dossier serait absent du replay sur un nouvel environnement, ce qui peut bloquer les migrations suivantes si elles s'appuient sur des fonctions ou colonnes créées par le fichier déplacé.

**Règle :** marquer les sections dépréciées avec un commentaire d'en-tête uniforme, et laisser le fichier en place :

```sql
-- DÉPRÉCIÉ : cette version de ma_rpc est remplacée par YYYYMMDD_nouvelle_migration.sql.
-- Conservé pour le replay complet des migrations — ne pas déplacer ni supprimer
-- (référencé par chemin exact dans supabase-migrations.test.ts).
```

---

## Helpers internes

Les fonctions appelées uniquement par d'autres RPCs (ex. `adjust_order_items_stock`, `adjust_order_stock`) doivent :

- avoir `GRANT EXECUTE ... TO service_role` uniquement (pas `authenticated`) ;
- être documentées comme "helper interne" dans le commentaire d'en-tête de migration.

---

## Anti-patterns à éviter

| Anti-pattern | Alternative |
|---|---|
| Ajouter un 20e param positionnel à `create_order_with_stock` | Créer `create_order_v2` avec JSONB |
| Dupliquer la logique de validation dans une nouvelle RPC | Extraire en helper SECURITY DEFINER interne |
| Utiliser `SECURITY INVOKER` pour une RPC sensible | Utiliser `SECURITY DEFINER` avec garde explicite |
| Lire `request.jwt.claim.role` directement | Utiliser `is_service_role()` |
| Appeler `adjust_order_stock` pour une commande multi-articles | Appeler `adjust_order_items_stock` |
