-- Align Supabase schema with current app features.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Public shop links.
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_slug_unique
  ON sellers(slug)
  WHERE slug IS NOT NULL;

-- Enriched customer profiles.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Public orders are created as pending before seller confirmation.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'));

-- Useful data integrity constraints. Kept idempotent for existing projects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_price_nonnegative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_cost_nonnegative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_cost_nonnegative CHECK (cost IS NULL OR cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_stock_nonnegative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_low_stock_alert_nonnegative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_low_stock_alert_nonnegative CHECK (low_stock_alert >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass AND conname = 'orders_quantity_positive'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_quantity_positive CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass AND conname = 'orders_cod_amount_nonnegative'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_cod_amount_nonnegative CHECK (cod_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'deliveries'::regclass AND conname = 'deliveries_fee_nonnegative'
  ) THEN
    ALTER TABLE deliveries ADD CONSTRAINT deliveries_fee_nonnegative CHECK (fee IS NULL OR fee >= 0);
  END IF;
END $$;

-- Marketing forms.
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL CHECK (position('@' in email) > 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email      TEXT NOT NULL CHECK (position('@' in email) > 1),
  message    TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Query indexes.
CREATE INDEX IF NOT EXISTS idx_customers_seller_phone
  ON customers(seller_id, phone);

CREATE INDEX IF NOT EXISTS idx_orders_seller_status
  ON orders(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at
  ON waitlist(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages(created_at DESC);
