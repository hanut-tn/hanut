-- ============================================================
-- HANUT — Schéma complet Supabase
-- À exécuter dans l'éditeur SQL de Supabase (Project > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLE sellers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT,
  plan             TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business')),
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can read own profile"
  ON sellers FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Sellers can update own profile"
  ON sellers FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Sellers can insert own profile"
  ON sellers FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. TABLE products
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

CREATE POLICY "Sellers manage own products"
  ON products FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. TABLE customers
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

CREATE POLICY "Sellers manage own customers"
  ON customers FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 4. TABLE orders
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

CREATE POLICY "Sellers manage own orders"
  ON orders FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. TABLE deliveries
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  carrier        TEXT NOT NULL
                 CHECK (carrier IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')),
  tracking_number TEXT,
  carrier_status  TEXT,
  fee            DECIMAL(10,2),
  cod_collected  BOOLEAN NOT NULL DEFAULT false,
  cod_reversed   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at   TIMESTAMP WITH TIME ZONE
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

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

-- Webhooks carriers : pas d'auth (service role)
-- La vérification se fait par signature dans le code

-- ─────────────────────────────────────────────────────────────
-- 6. FONCTION — décrémentation du stock
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - qty)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 7. FONCTION — incrémenter order_count d'un client
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_customer_order_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET order_count = order_count + 1
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_increment_customer_count
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_customer_order_count();

-- ─────────────────────────────────────────────────────────────
-- 8. INDEX pour les requêtes courantes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_seller_id     ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller_id   ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_seller_id  ON customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id  ON deliveries(order_id);
