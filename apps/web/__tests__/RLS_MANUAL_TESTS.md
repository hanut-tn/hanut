# Tests RLS manuels — Hanut

Ces tests ne peuvent pas être automatisés sans une instance Supabase locale.
À exécuter dans **Dashboard Supabase → SQL Editor** ou via `supabase-js` en mode test.

---

## 1. Isolation vendeurs — un vendeur ne voit pas les données d'un autre

```sql
-- Connecté en tant que seller_A (remplacer par l'UUID réel)
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT * FROM orders WHERE seller_id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

```sql
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT * FROM products WHERE seller_id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

```sql
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT * FROM customers WHERE seller_id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

---

## 2. Operator ne peut pas DELETE (RLS is_seller_admin)

```sql
-- Connecté en tant que operator_user (membre d'équipe avec rôle operator)
SET request.jwt.claims = '{"sub": "operator_user_uuid", "role": "authenticated"}';
DELETE FROM orders WHERE id = 'any_order_uuid';
-- Résultat attendu : 0 lignes supprimées (RLS bloque)
```

```sql
SET request.jwt.claims = '{"sub": "operator_user_uuid", "role": "authenticated"}';
DELETE FROM products WHERE id = 'any_product_uuid';
-- Résultat attendu : 0 lignes supprimées
```

```sql
SET request.jwt.claims = '{"sub": "operator_user_uuid", "role": "authenticated"}';
DELETE FROM customers WHERE id = 'any_customer_uuid';
-- Résultat attendu : 0 lignes supprimées
```

---

## 3. Storage scopé par seller_id

Via Supabase Storage API (JavaScript) — connecté avec la session d'un autre vendeur :

```js
// Tenter d'uploader dans le dossier de seller_b
const { error } = await supabase.storage
  .from('product-images')
  .upload('seller_b_uuid/test.jpg', file)
// Résultat attendu : error non null, status 403
```

```js
// Tenter de supprimer un fichier appartenant à seller_b
const { error } = await supabase.storage
  .from('product-images')
  .remove(['seller_b_uuid/some_image.jpg'])
// Résultat attendu : error non null, status 403
```

---

## 4. Sellers RLS — accès limité à son propre profil

```sql
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT * FROM sellers WHERE id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

```sql
-- Un seller ne peut pas lire les clés API ou infos d'un autre seller
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
UPDATE sellers SET plan = 'business' WHERE id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes modifiées
```

---

## 5. Team members — isolation des équipes

```sql
-- Un membre de la boutique A ne voit pas les membres de la boutique B
SET request.jwt.claims = '{"sub": "member_of_shop_a_uuid", "role": "authenticated"}';
SELECT * FROM team_members WHERE seller_id = 'shop_b_uuid';
-- Résultat attendu : 0 lignes
```

---

## 6. Activity logs — un vendeur ne voit que ses propres logs

```sql
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT * FROM activity_logs WHERE seller_id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

---

## 7. Deliveries — isolation via orders

```sql
-- Une livraison appartient à une commande. L'isolation est indirecte.
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT d.* FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE o.seller_id = 'seller_b_uuid';
-- Résultat attendu : 0 lignes
```

---

## 8. RPC get_analytics_summary — accès vérifié avant agrégation

```sql
-- Un vendeur ne peut pas appeler get_analytics_summary pour un autre seller
SET request.jwt.claims = '{"sub": "seller_a_uuid", "role": "authenticated"}';
SELECT get_analytics_summary('seller_b_uuid', NOW() - INTERVAL '30 days', NOW());
-- Résultat attendu : exception 'Non autorise'
```

---

## Notes d'exécution

- Pour simuler un utilisateur dans le SQL Editor Supabase, utiliser
  `SET LOCAL request.jwt.claims = ...` (valable pour la transaction).
- Les UUIDs doivent être remplacés par des valeurs réelles de votre projet.
- Ces tests doivent passer sur la base de production avant chaque release.
- Fréquence recommandée : après chaque migration qui modifie des policies RLS.
