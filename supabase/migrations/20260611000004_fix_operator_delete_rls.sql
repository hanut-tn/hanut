-- Retirer le droit DELETE aux opérateurs (operators).
-- Les operateurs peuvent lire et écrire mais pas supprimer — seuls les admins (owners) peuvent.
-- Les server actions vérifient déjà le rôle côté applicatif ; cette migration
-- ajoute la protection au niveau DB.

CREATE OR REPLACE FUNCTION is_seller_admin(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sellers WHERE id = auth.uid() AND id = p_seller_id
  )
$$;

REVOKE ALL ON FUNCTION is_seller_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_seller_admin(UUID) TO authenticated, service_role;

-- Orders DELETE
DROP POLICY IF EXISTS "orders_team_delete" ON orders;

CREATE POLICY "orders_team_delete" ON orders FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND is_seller_admin(seller_id)
  );

-- Customers DELETE
DROP POLICY IF EXISTS "customers_team_delete" ON customers;

CREATE POLICY "customers_team_delete" ON customers FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND is_seller_admin(seller_id)
  );

-- Products DELETE
DROP POLICY IF EXISTS "products_team_delete" ON products;

CREATE POLICY "products_team_delete" ON products FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND is_seller_admin(seller_id)
  );

-- Deliveries DELETE
DROP POLICY IF EXISTS "deliveries_team_delete" ON deliveries;

CREATE POLICY "deliveries_team_delete" ON deliveries FOR DELETE
  USING (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND is_seller_admin(get_seller_id())
  );
