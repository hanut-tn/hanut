-- Table order_otps : codes OTP pour vérifier l'email avant de créer une commande publique.
-- Chaque code est valide 5 minutes. L'API limite les envois par IP et par destinataire,
-- et la table bloque le code après 5 saisies incorrectes.
-- Seul service_role peut accéder à cette table (pas de RLS utilisateur).

CREATE TABLE IF NOT EXISTS order_otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID        NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  slug       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  code_hash  TEXT        NOT NULL,
  attempts   INTEGER     NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  verified   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_otps_seller_email_unique
  ON order_otps (seller_id, email);

CREATE INDEX IF NOT EXISTS idx_order_otps_lookup
  ON order_otps (seller_id, email, created_at DESC)
  WHERE verified = false;

ALTER TABLE order_otps ENABLE ROW LEVEL SECURITY;

-- Aucun accès depuis les rôles clients — seul service_role lit/écrit cette table.
DROP POLICY IF EXISTS "No public access to order_otps" ON order_otps;
CREATE POLICY "No public access to order_otps"
  ON order_otps FOR ALL
  USING (false);

REVOKE ALL ON TABLE order_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE order_otps TO service_role;

-- Nettoyage automatique des codes expirés sur chaque insertion (évite l'accumulation).
CREATE OR REPLACE FUNCTION cleanup_expired_order_otps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM order_otps WHERE expires_at < now() - INTERVAL '1 hour';
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_expired_order_otps() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cleanup_expired_order_otps ON order_otps;
CREATE TRIGGER trg_cleanup_expired_order_otps
  AFTER INSERT ON order_otps
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_order_otps();

NOTIFY pgrst, 'reload schema';
