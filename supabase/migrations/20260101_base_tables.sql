-- Tables de base telles qu'elles existaient avant la première migration
-- (20260601_add_missing_app_schema). Reconstruit pour que supabase start
-- puisse rejouer toutes les migrations sur un Postgres vierge (CI).
-- Chaque instruction est idempotente : ce fichier s'applique aussi en
-- second rôle, après schema.sql, sans provoquer d'erreur (job check-migrations).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- TABLE sellers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT,
  plan             TEXT NOT NULL DEFAULT 'starter',
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can read own profile"   ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can insert own profile" ON sellers;

CREATE POLICY "Sellers can read own profile"
  ON sellers FOR SELECT USING (id = auth.uid());
CREATE POLICY "Sellers can update own profile"
  ON sellers FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Sellers can insert own profile"
  ON sellers FOR INSERT WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- TABLE products
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  cost            DECIMAL(10,2),
  stock           INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 3,
  variants        JSONB NOT NULL DEFAULT '[]',
  image_url       TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own products" ON products;

CREATE POLICY "Sellers manage own products"
  ON products FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- TABLE customers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own customers" ON customers;

CREATE POLICY "Sellers manage own customers"
  ON customers FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- TABLE orders
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  variant     TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  cod_amount  DECIMAL(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'confirmed', 'shipped', 'delivered', 'returned')),
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own orders" ON orders;

CREATE POLICY "Sellers manage own orders"
  ON orders FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE deliveries
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier         TEXT NOT NULL
                  CHECK (carrier IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')),
  tracking_number TEXT,
  carrier_status  TEXT,
  fee             DECIMAL(10,2),
  cod_collected   BOOLEAN NOT NULL DEFAULT false,
  cod_reversed    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at    TIMESTAMP WITH TIME ZONE
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own deliveries" ON deliveries;

CREATE POLICY "Sellers manage own deliveries"
  ON deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliveries.order_id
        AND orders.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliveries.order_id
        AND orders.seller_id = auth.uid()
    )
  );

-- Trigger supplémenté par 20260610_fix_order_count_trigger,
-- supprimé par 20260624_fix_double_order_count_trigger.
CREATE OR REPLACE FUNCTION increment_customer_order_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET order_count = order_count + 1 WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_increment_customer_count ON orders;
CREATE TRIGGER orders_increment_customer_count
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_customer_order_count();

-- ─────────────────────────────────────────────────────────────
-- Index de base
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_seller_id    ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_seller_id  ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_seller_id ON customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
