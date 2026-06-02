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
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at  TIMESTAMPTZ,
  UNIQUE (seller_id, user_id),
  UNIQUE (seller_id, email)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SELECT : owner, membres actifs, ou invitée en attente
CREATE POLICY "team_select" ON team_members FOR SELECT
  USING (
    seller_id IN (SELECT id FROM sellers WHERE id = auth.uid())
    OR user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT : owner ou admin actif
CREATE POLICY "team_insert" ON team_members FOR INSERT
  WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE id = auth.uid())
    OR seller_id IN (
      SELECT seller_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- UPDATE : owner, admin actif, ou activation de sa propre invitation
CREATE POLICY "team_update" ON team_members FOR UPDATE
  USING (
    seller_id IN (SELECT id FROM sellers WHERE id = auth.uid())
    OR seller_id IN (
      SELECT seller_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
    OR (
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  );

-- DELETE : owner ou admin actif
CREATE POLICY "team_delete" ON team_members FOR DELETE
  USING (
    seller_id IN (SELECT id FROM sellers WHERE id = auth.uid())
    OR seller_id IN (
      SELECT seller_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- ============================================================
-- Accès aux données pour les membres de l'équipe
-- ============================================================

-- Fonction utilitaire : seller_id effectif pour l'utilisateur courant
CREATE OR REPLACE FUNCTION get_seller_id() RETURNS UUID
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(
      (SELECT id FROM sellers WHERE id = auth.uid()),
      (SELECT seller_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    );
  $$;

-- orders : membres de l'équipe peuvent lire
CREATE POLICY "orders_team_read" ON orders FOR SELECT
  USING (seller_id = get_seller_id());

-- orders : membres non-readonly peuvent écrire
CREATE POLICY "orders_team_insert" ON orders FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

CREATE POLICY "orders_team_update" ON orders FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

CREATE POLICY "orders_team_delete" ON orders FOR DELETE
  USING (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

-- customers
CREATE POLICY "customers_team_read" ON customers FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "customers_team_write" ON customers FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

CREATE POLICY "customers_team_update" ON customers FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

-- products
CREATE POLICY "products_team_read" ON products FOR SELECT
  USING (seller_id = get_seller_id());

CREATE POLICY "products_team_write" ON products FOR INSERT
  WITH CHECK (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

CREATE POLICY "products_team_update" ON products FOR UPDATE
  USING (
    seller_id = get_seller_id()
    AND (
      seller_id = auth.uid()
      OR seller_id IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );

-- deliveries : membres peuvent lire, opérateurs peuvent écrire
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
    AND (
      get_seller_id() = auth.uid()
      OR get_seller_id() IN (
        SELECT seller_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'operator') AND status = 'active'
      )
    )
  );
