-- Réapprovisionnements planifiés
CREATE TABLE IF NOT EXISTS restock_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'received', 'cancelled')),
  variants_quantities JSONB NOT NULL DEFAULT '[]',
  total_quantity      INTEGER NOT NULL CHECK (total_quantity > 0),
  unit_cost           DECIMAL(10,2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  supplier            TEXT,
  expected_date       DATE,
  received_date       DATE,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_orders_seller
  ON restock_orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_restock_orders_product
  ON restock_orders(product_id);

ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restock_orders_select" ON restock_orders;
DROP POLICY IF EXISTS "restock_orders_insert" ON restock_orders;
DROP POLICY IF EXISTS "restock_orders_update" ON restock_orders;

CREATE POLICY "restock_orders_select" ON restock_orders
  FOR SELECT USING (seller_id = get_seller_id());

CREATE POLICY "restock_orders_insert" ON restock_orders
  FOR INSERT WITH CHECK (seller_id = get_seller_id() AND can_write_seller(seller_id));

CREATE POLICY "restock_orders_update" ON restock_orders
  FOR UPDATE USING (seller_id = get_seller_id())
  WITH CHECK (seller_id = get_seller_id() AND can_write_seller(seller_id));

-- Synchronise product.stock = SUM(variants[].qty)
-- Appelée quand les variantes d'un produit changent manuellement
CREATE OR REPLACE FUNCTION sync_product_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_variants JSONB;
  v_total    INTEGER := 0;
  v_variant  JSONB;
  v_seller_id UUID;
  v_current_stock INTEGER;
BEGIN
  SELECT seller_id, variants, stock
  INTO v_seller_id, v_variants, v_current_stock
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF v_seller_id IS DISTINCT FROM get_seller_id() OR NOT can_write_seller(v_seller_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_variants IS NOT NULL AND jsonb_array_length(v_variants) > 0 THEN
    FOR v_variant IN SELECT * FROM jsonb_array_elements(v_variants)
    LOOP
      v_total := v_total + COALESCE((v_variant->>'qty')::INTEGER, 0);
    END LOOP;

    UPDATE products
    SET stock = v_total
    WHERE id = p_product_id
      AND seller_id = v_seller_id;
    RETURN v_total;
  END IF;

  RETURN v_current_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION sync_product_stock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_product_stock(UUID) TO authenticated, service_role;
