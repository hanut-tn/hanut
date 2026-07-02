-- Vérifie et consomme l'OTP dans la même transaction que la création de
-- commande. Un échec de stock/quota ne consomme pas le code, tandis qu'un
-- double clic concurrent ne peut créer qu'une seule commande.

-- Compatibilité avec une éventuelle application préalable de la première
-- version de 20260710 qui stockait le code en clair.
TRUNCATE TABLE order_otps;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_otps'
      AND column_name = 'code'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_otps'
      AND column_name = 'code_hash'
  ) THEN
    ALTER TABLE order_otps RENAME COLUMN code TO code_hash;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_otps'
      AND column_name = 'code'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_otps'
      AND column_name = 'code_hash'
  ) THEN
    ALTER TABLE order_otps DROP COLUMN code;
  END IF;
END;
$$;

ALTER TABLE order_otps
  ADD COLUMN IF NOT EXISTS seller_id UUID,
  ADD COLUMN IF NOT EXISTS code_hash TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

UPDATE order_otps AS otp
SET seller_id = seller.id
FROM sellers AS seller
WHERE otp.seller_id IS NULL
  AND seller.slug = otp.slug;

DELETE FROM order_otps WHERE seller_id IS NULL;

ALTER TABLE order_otps
  ALTER COLUMN seller_id SET NOT NULL,
  ALTER COLUMN code_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_otps_seller_id_fkey'
      AND conrelid = 'order_otps'::regclass
  ) THEN
    ALTER TABLE order_otps
      ADD CONSTRAINT order_otps_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE order_otps
  DROP CONSTRAINT IF EXISTS order_otps_attempts_check;

ALTER TABLE order_otps
  ADD CONSTRAINT order_otps_attempts_check
  CHECK (attempts BETWEEN 0 AND 5);

DROP INDEX IF EXISTS idx_order_otps_lookup;
DROP INDEX IF EXISTS idx_order_otps_slug_email_unique;
DROP INDEX IF EXISTS idx_order_otps_seller_email_unique;
CREATE UNIQUE INDEX idx_order_otps_seller_email_unique
  ON order_otps (seller_id, email);

CREATE INDEX idx_order_otps_lookup
  ON order_otps (seller_id, email, created_at DESC)
  WHERE verified = false;

CREATE OR REPLACE FUNCTION create_public_order_with_otp(
  p_slug             TEXT,
  p_email            TEXT,
  p_code_hash        TEXT,
  p_product_id       UUID,
  p_quantity         INTEGER,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_customer_address TEXT DEFAULT NULL,
  p_customer_city    TEXT DEFAULT NULL,
  p_variant          TEXT DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp            order_otps%ROWTYPE;
  v_seller_id      UUID;
  v_order_id       UUID;
  v_tracking_token TEXT;
  v_order_error    TEXT;
BEGIN
  IF NOT is_service_role() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT id
  INTO v_seller_id
  FROM sellers
  WHERE slug = lower(trim(p_slug));

  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'SHOP_NOT_FOUND');
  END IF;

  SELECT *
  INTO v_otp
  FROM order_otps
  WHERE seller_id = v_seller_id
    AND slug = lower(trim(p_slug))
    AND email = lower(trim(p_email))
    AND verified = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_NOT_FOUND');
  END IF;

  IF v_otp.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_EXPIRED');
  END IF;

  IF v_otp.attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP_TOO_MANY_ATTEMPTS');
  END IF;

  IF v_otp.code_hash <> p_code_hash THEN
    UPDATE order_otps
    SET attempts = LEAST(attempts + 1, 5)
    WHERE id = v_otp.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', CASE
        WHEN v_otp.attempts + 1 >= 5 THEN 'OTP_TOO_MANY_ATTEMPTS'
        ELSE 'OTP_INCORRECT'
      END
    );
  END IF;

  BEGIN
    v_order_id := create_order_with_stock(
      p_seller_id        => v_seller_id,
      p_product_id       => p_product_id,
      p_quantity         => p_quantity,
      p_customer_name    => p_customer_name,
      p_customer_phone   => p_customer_phone,
      p_customer_address => p_customer_address,
      p_customer_city    => p_customer_city,
      p_customer_id      => NULL,
      p_variant          => p_variant,
      p_cod_amount       => NULL,
      p_notes            => p_notes,
      p_status           => 'pending',
      p_changed_by       => NULL,
      p_customer_email   => lower(trim(p_email))
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_order_error = MESSAGE_TEXT;
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ORDER_CREATION_FAILED',
      'detail', v_order_error
    );
  END;

  UPDATE order_otps
  SET verified = true
  WHERE id = v_otp.id
    AND verified = false;

  SELECT tracking_token
  INTO v_tracking_token
  FROM orders
  WHERE id = v_order_id
    AND seller_id = v_seller_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'tracking_token', v_tracking_token,
    'seller_id', v_seller_id
  );
END;
$$;

REVOKE ALL ON FUNCTION create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_public_order_with_otp(
  TEXT, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

NOTIFY pgrst, 'reload schema';
