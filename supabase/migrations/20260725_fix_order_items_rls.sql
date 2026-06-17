-- Corrige la policy SELECT de order_items pour utiliser get_seller_id()
-- au lieu du UID direct. Un membre d'équipe a un UID différent du seller_id
-- de la boutique, donc la jointure order_items retournait un tableau vide
-- pour tous les opérateurs et lecteurs.
--
-- Toutes les mutations (INSERT / UPDATE / DELETE) sur order_items passent
-- uniquement par des RPCs SECURITY DEFINER — pas de policy nécessaire pour
-- ces opérations.

DROP POLICY IF EXISTS "Sellers read own order items" ON order_items;
DROP POLICY IF EXISTS "order_items_team_read" ON order_items;

CREATE POLICY "order_items_team_read"
  ON order_items FOR SELECT
  USING (seller_id = get_seller_id());

NOTIFY pgrst, 'reload schema';
