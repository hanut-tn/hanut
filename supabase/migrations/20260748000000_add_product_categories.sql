-- Catégories produits : classement libre par vendeur, filtrage catalogue + mini boutique.

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_seller_id ON categories(seller_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies categories — mêmes règles que products (get_seller_id / can_write_seller)
-- ============================================================

DROP POLICY IF EXISTS "categories_read" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

CREATE POLICY "categories_read" ON categories FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  )
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

-- ============================================================
-- Policies product_categories — dérivées du produit lié
-- ============================================================

DROP POLICY IF EXISTS "product_categories_read" ON product_categories;
DROP POLICY IF EXISTS "product_categories_write" ON product_categories;
DROP POLICY IF EXISTS "product_categories_delete" ON product_categories;

CREATE POLICY "product_categories_read" ON product_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_categories.product_id
        AND p.seller_id = get_seller_id()
    )
  );

CREATE POLICY "product_categories_write" ON product_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_categories.product_id
        AND p.seller_id = get_seller_id()
        AND can_write_seller(p.seller_id)
    )
  );

CREATE POLICY "product_categories_delete" ON product_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_categories.product_id
        AND p.seller_id = get_seller_id()
        AND can_write_seller(p.seller_id)
    )
  );

-- Note : /s/[slug] (mini boutique publique) lit via createServiceClient() (clé
-- service_role, RLS contournée) — exactement comme sellers/products aujourd'hui.
-- Aucune policy "public read" n'est donc nécessaire ici.
