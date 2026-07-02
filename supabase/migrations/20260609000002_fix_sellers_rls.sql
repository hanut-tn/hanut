-- ============================================================
-- Sécurisation RLS de sellers
-- ============================================================

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Nettoie toutes les policies précédentes sur sellers afin d'éviter
-- qu'une ancienne règle trop large reste active en parallèle.
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sellers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sellers', policy_name);
  END LOOP;
END $$;

-- Lecture :
-- - le owner lit sa propre ligne ;
-- - un membre d'équipe actif lit uniquement le seller auquel il appartient.
CREATE POLICY "sellers_select_owner_or_active_team"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR get_team_role(id) IN ('admin', 'operator', 'readonly')
  );

-- Insertion :
-- un utilisateur authentifié ne peut créer que sa propre ligne seller.
CREATE POLICY "sellers_insert_own_profile"
  ON sellers
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Mise à jour :
-- seul le owner réel peut modifier sa ligne seller.
-- Les membres d'équipe, y compris operator et readonly, sont exclus.
CREATE POLICY "sellers_update_owner_only"
  ON sellers
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Pas de policy DELETE volontairement :
-- la suppression d'un compte seller doit passer par la RPC sécurisée
-- delete_seller_account exécutée côté service_role.
