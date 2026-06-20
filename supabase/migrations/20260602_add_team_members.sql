-- ============================================================
-- Équipe (multi-utilisateurs) — plan Business
-- ============================================================

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'readonly')),
  email      TEXT NOT NULL,
  name       TEXT,
  status     TEXT NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at  TIMESTAMPTZ,
  UNIQUE (seller_id, user_id),
  UNIQUE (seller_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_seller_id
  ON team_members(seller_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_active
  ON team_members(user_id, status)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_email_pending
  ON team_members(lower(email), status);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Fonctions utilitaires RLS
-- ============================================================

CREATE OR REPLACE FUNCTION get_seller_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM sellers WHERE id = auth.uid()),
    (
      SELECT seller_id
      FROM team_members
      WHERE user_id = auth.uid()
        AND status = 'active'
      ORDER BY joined_at NULLS LAST, invited_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION get_team_role(p_seller_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN p_seller_id = auth.uid() THEN 'admin'
    ELSE (
      SELECT role
      FROM team_members
      WHERE seller_id = p_seller_id
        AND user_id = auth.uid()
        AND status = 'active'
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION can_write_seller(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(get_team_role(p_seller_id) IN ('admin', 'operator'), false);
$$;

REVOKE ALL ON FUNCTION get_seller_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_team_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_write_seller(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_seller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_team_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_write_seller(UUID) TO authenticated, service_role;

-- ============================================================
-- Policies team_members
-- ============================================================

DROP POLICY IF EXISTS "team_select" ON team_members;
DROP POLICY IF EXISTS "team_insert" ON team_members;
DROP POLICY IF EXISTS "team_update" ON team_members;
DROP POLICY IF EXISTS "team_delete" ON team_members;

CREATE POLICY "team_select" ON team_members FOR SELECT
  USING (
    seller_id = auth.uid()
    OR user_id = auth.uid()
    OR lower(email) = lower(auth.jwt() ->> 'email')
    OR get_team_role(seller_id) = 'admin'
  );

CREATE POLICY "team_insert" ON team_members FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    OR get_team_role(seller_id) = 'admin'
  );

CREATE POLICY "team_update" ON team_members FOR UPDATE
  USING (
    seller_id = auth.uid()
    OR get_team_role(seller_id) = 'admin'
  )
  WITH CHECK (
    seller_id = auth.uid()
    OR get_team_role(seller_id) = 'admin'
  );

CREATE POLICY "team_delete" ON team_members FOR DELETE
  USING (
    seller_id = auth.uid()
    OR get_team_role(seller_id) = 'admin'
  );

-- ============================================================
-- Accès aux données pour les membres de l'équipe
-- ============================================================

DROP POLICY IF EXISTS "orders_team_read" ON orders;
DROP POLICY IF EXISTS "orders_team_insert" ON orders;
DROP POLICY IF EXISTS "orders_team_update" ON orders;
DROP POLICY IF EXISTS "orders_team_delete" ON orders;

CREATE POLICY "orders_team_read" ON orders FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "orders_team_insert" ON orders FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "orders_team_update" ON orders FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  )
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "orders_team_delete" ON orders FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

DROP POLICY IF EXISTS "customers_team_read" ON customers;
DROP POLICY IF EXISTS "customers_team_write" ON customers;
DROP POLICY IF EXISTS "customers_team_update" ON customers;
DROP POLICY IF EXISTS "customers_team_delete" ON customers;

CREATE POLICY "customers_team_read" ON customers FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "customers_team_write" ON customers FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "customers_team_update" ON customers FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  )
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "customers_team_delete" ON customers FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

DROP POLICY IF EXISTS "products_team_read" ON products;
DROP POLICY IF EXISTS "products_team_write" ON products;
DROP POLICY IF EXISTS "products_team_update" ON products;
DROP POLICY IF EXISTS "products_team_delete" ON products;

CREATE POLICY "products_team_read" ON products FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "products_team_write" ON products FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "products_team_update" ON products FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  )
  WITH CHECK (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

CREATE POLICY "products_team_delete" ON products FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND can_write_seller(seller_id)
  );

DROP POLICY IF EXISTS "deliveries_team_read" ON deliveries;
DROP POLICY IF EXISTS "deliveries_team_insert" ON deliveries;
DROP POLICY IF EXISTS "deliveries_team_update" ON deliveries;
DROP POLICY IF EXISTS "deliveries_team_delete" ON deliveries;

CREATE POLICY "deliveries_team_read" ON deliveries FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
  );

CREATE POLICY "deliveries_team_insert" ON deliveries FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND can_write_seller(get_seller_id())
  );

CREATE POLICY "deliveries_team_update" ON deliveries FOR UPDATE
  USING (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND can_write_seller(get_seller_id())
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND can_write_seller(get_seller_id())
  );

CREATE POLICY "deliveries_team_delete" ON deliveries FOR DELETE
  USING (
    order_id IN (
      SELECT id FROM orders WHERE seller_id = get_seller_id()
    )
    AND can_write_seller(get_seller_id())
  );
