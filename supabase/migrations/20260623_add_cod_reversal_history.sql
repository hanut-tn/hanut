-- Historique des reversements COD.
-- cod_reversed (booléen) est conservé pour compatibilité ascendante avec les
-- livraisons existantes. Les nouveaux reversements passent par mark_delivery_cod_reversed
-- qui remplit les colonnes d'audit et insère dans cod_reversals.

-- ─────────────────────────────────────────────────────────────
-- 1. Colonnes d'audit sur deliveries
-- ─────────────────────────────────────────────────────────────
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS cod_reversed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cod_reversed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS cod_reversed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE deliveries
SET cod_reversed_amount = 0
WHERE cod_reversed_amount IS NULL;

ALTER TABLE deliveries
  ALTER COLUMN cod_reversed_amount SET DEFAULT 0,
  ALTER COLUMN cod_reversed_amount SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'deliveries'::regclass
      AND conname = 'deliveries_cod_reversed_amount_nonnegative'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT deliveries_cod_reversed_amount_nonnegative
      CHECK (cod_reversed_amount >= 0);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Table d'historique
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cod_reversals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID        NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  seller_id   UUID        NOT NULL REFERENCES sellers(id)   ON DELETE CASCADE,
  amount      NUMERIC     NOT NULL CHECK (amount > 0),
  notes       TEXT,
  reversed_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reversed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cod_reversals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cod_reversals_select" ON cod_reversals;
DROP POLICY IF EXISTS "cod_reversals_insert" ON cod_reversals;

CREATE POLICY "cod_reversals_select" ON cod_reversals
  FOR SELECT TO authenticated
  USING (seller_id = get_seller_id());

CREATE INDEX IF NOT EXISTS idx_cod_reversals_seller    ON cod_reversals(seller_id, reversed_at DESC);
DROP INDEX IF EXISTS idx_cod_reversals_delivery;

-- Si une première version de cette migration a déjà été testée, conserver
-- uniquement la trace la plus récente avant de poser l'unicité.
WITH ranked_reversals AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY delivery_id
      ORDER BY reversed_at DESC, id DESC
    ) AS row_number
  FROM cod_reversals
)
DELETE FROM cod_reversals reversal
USING ranked_reversals ranked
WHERE reversal.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cod_reversals_delivery_unique ON cod_reversals(delivery_id);

-- Reconstituer une trace minimale pour les reversements créés par l'ancien toggle.
UPDATE deliveries d
SET
  cod_reversed_at = COALESCE(d.cod_reversed_at, d.delivered_at, d.created_at),
  cod_reversed_amount = CASE
    WHEN d.cod_reversed_amount > 0 THEN d.cod_reversed_amount
    ELSE o.cod_amount
  END
FROM orders o
WHERE o.id = d.order_id
  AND d.cod_reversed = true;

INSERT INTO cod_reversals (
  delivery_id, seller_id, amount, notes, reversed_by, reversed_at
)
SELECT
  d.id,
  o.seller_id,
  d.cod_reversed_amount,
  'Historique reconstitué depuis le statut COD existant',
  d.cod_reversed_by,
  COALESCE(d.cod_reversed_at, d.delivered_at, d.created_at)
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.cod_reversed = true
  AND d.cod_reversed_amount > 0
ON CONFLICT (delivery_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. RPC mark_delivery_cod_reversed
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_delivery_cod_reversed(
  p_delivery_id UUID,
  p_seller_id   UUID,
  p_amount      NUMERIC,
  p_notes       TEXT    DEFAULT NULL,
  p_reversed_by UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reversal_id UUID;
  v_cod_amount  NUMERIC;
  v_already_reversed BOOLEAN;
  v_actor       UUID;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    AND NOT COALESCE(get_team_role(p_seller_id) = 'admin', false)
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_actor := CASE
    WHEN COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      THEN p_reversed_by
    ELSE auth.uid()
  END;

  -- Vérifier que la livraison appartient au vendeur et que le COD a bien été collecté.
  SELECT o.cod_amount, d.cod_reversed
  INTO v_cod_amount, v_already_reversed
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id        = p_delivery_id
    AND o.seller_id = p_seller_id
    AND d.cod_collected = true
  FOR UPDATE OF d, o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND_OR_COD_NOT_COLLECTED';
  END IF;

  IF v_already_reversed THEN
    RAISE EXCEPTION 'COD_ALREADY_REVERSED';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_cod_amount THEN
    RAISE EXCEPTION 'INVALID_REVERSAL_AMOUNT';
  END IF;

  INSERT INTO cod_reversals (delivery_id, seller_id, amount, notes, reversed_by)
  VALUES (
    p_delivery_id,
    p_seller_id,
    p_amount,
    NULLIF(left(trim(COALESCE(p_notes, '')), 2000), ''),
    v_actor
  )
  RETURNING id INTO v_reversal_id;

  UPDATE deliveries
  SET
    cod_reversed        = true,
    cod_reversed_at     = now(),
    cod_reversed_amount = p_amount,
    cod_reversed_by     = v_actor
  WHERE id = p_delivery_id;

  RETURN v_reversal_id;
END;
$$;

REVOKE ALL ON FUNCTION mark_delivery_cod_reversed(UUID, UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_delivery_cod_reversed(UUID, UUID, NUMERIC, TEXT, UUID) TO authenticated, service_role;
