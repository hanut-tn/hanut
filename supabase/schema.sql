-- ============================================================
-- HANUT — Schéma complet Supabase
-- À exécuter dans l'éditeur SQL de Supabase (Project > SQL Editor)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. TABLE sellers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT,
  slug             TEXT UNIQUE,
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
  price           DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost            DECIMAL(10,2) CHECK (cost IS NULL OR cost >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_alert INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_alert >= 0),
  variants        JSONB NOT NULL DEFAULT '[]',
  image_url       TEXT,
  description     TEXT,
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
  tags        TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT,
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
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  cod_amount  DECIMAL(10,2) NOT NULL CHECK (cod_amount >= 0),
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned')),
  notes       TEXT,
  deleted_at  TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES auth.users(id),
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
  fee            DECIMAL(10,2) CHECK (fee IS NULL OR fee >= 0),
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
-- 6. TABLE waitlist
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL CHECK (position('@' in email) > 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Insertion via route serveur avec service role.

-- ─────────────────────────────────────────────────────────────
-- 7. TABLE contact_messages
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email      TEXT NOT NULL CHECK (position('@' in email) > 1),
  message    TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Insertion via route serveur avec service role.

-- ─────────────────────────────────────────────────────────────
-- 8. FONCTION — créer une commande avec décrémentation atomique du stock
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_order_with_stock(
  p_seller_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT DEFAULT NULL,
  p_customer_city TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_variant TEXT DEFAULT NULL,
  p_cod_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'new'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_customer_id UUID;
  v_order_id UUID;
  v_customer_name TEXT := NULLIF(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone TEXT := NULLIF(trim(coalesce(p_customer_phone, '')), '');
  v_customer_address TEXT := NULLIF(trim(coalesce(p_customer_address, '')), '');
  v_customer_city TEXT := NULLIF(trim(coalesce(p_customer_city, '')), '');
  v_variant TEXT := NULLIF(trim(coalesce(p_variant, '')), '');
  v_notes TEXT := NULLIF(trim(coalesce(p_notes, '')), '');
  v_cod_amount NUMERIC(10,2);
BEGIN
  IF p_seller_id IS NULL THEN
    RAISE EXCEPTION 'Vendeur introuvable';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  IF v_customer_name IS NULL THEN
    RAISE EXCEPTION 'Nom client obligatoire';
  END IF;

  IF v_customer_phone IS NULL THEN
    RAISE EXCEPTION 'Téléphone client obligatoire';
  END IF;

  IF p_status NOT IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Statut de commande invalide';
  END IF;

  SELECT *
  INTO v_product
  FROM products
  WHERE id = p_product_id
    AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant. Il reste % unité(s) disponible(s).', v_product.stock;
  END IF;

  v_cod_amount := COALESCE(p_cod_amount, v_product.price * p_quantity);

  IF v_cod_amount < 0 THEN
    RAISE EXCEPTION 'Montant COD invalide';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id
    INTO v_customer_id
    FROM customers
    WHERE id = p_customer_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'Client introuvable';
    END IF;
  ELSE
    SELECT id
    INTO v_customer_id
    FROM customers
    WHERE seller_id = p_seller_id
      AND phone = v_customer_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (
        seller_id,
        name,
        phone,
        address,
        city
      )
      VALUES (
        p_seller_id,
        v_customer_name,
        v_customer_phone,
        v_customer_address,
        v_customer_city
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  UPDATE customers
  SET
    name = v_customer_name,
    phone = v_customer_phone,
    address = v_customer_address,
    city = v_customer_city
  WHERE id = v_customer_id
    AND seller_id = p_seller_id;

  INSERT INTO orders (
    seller_id,
    customer_id,
    product_id,
    variant,
    quantity,
    cod_amount,
    notes,
    status
  )
  VALUES (
    p_seller_id,
    v_customer_id,
    p_product_id,
    v_variant,
    p_quantity,
    v_cod_amount,
    v_notes,
    p_status
  )
  RETURNING id INTO v_order_id;

  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id
    AND seller_id = p_seller_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_stock(
  UUID,
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_order_with_stock(
  UUID,
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT
) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 9. FONCTION — incrémenter order_count d'un client
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
-- 10. INDEX pour les requêtes courantes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_seller_id     ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at    ON orders(seller_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_seller_id   ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_seller_id  ON customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_seller_phone ON customers(seller_id, phone);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id  ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at  ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
