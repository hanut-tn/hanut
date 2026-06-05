-- Historique des mouvements de stock (réapprovisionnement, corrections, retours, pertes, commandes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id        UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name     TEXT,
  quantity_before  INTEGER,
  quantity_after   INTEGER,
  delta            INTEGER NOT NULL,
  movement_type    TEXT NOT NULL CHECK (movement_type IN ('order', 'order_cancel', 'restock', 'correction', 'return', 'loss')),
  unit_cost        DECIMAL(10,2),
  supplier         TEXT,
  notes            TEXT,
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES auth.users(id),
  created_by_name  TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_seller
  ON stock_movements(seller_id, created_at DESC);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_read" ON stock_movements FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT
  WITH CHECK (seller_id = get_seller_id() AND can_write_seller(seller_id));
