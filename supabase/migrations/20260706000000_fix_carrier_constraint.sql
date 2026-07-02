-- La contrainte deliveries_carrier_check de 20260701 utilise
-- carrier IN ('intigo', ...) ce qui laisse passer carrier IS NULL
-- quand delivery_type = 'carrier' (NULL IN (...) = NULL, pas FALSE).
-- Cette migration remplace la contrainte par une version correcte.

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM deliveries
  WHERE (
    (
      delivery_type = 'self'
      AND carrier IS NULL
      AND tracking_number IS NULL
      AND fee IS NULL
    )
    OR
    (
      delivery_type = 'carrier'
      AND carrier IS NOT NULL
      AND carrier IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')
      AND vendor_note IS NULL
    )
  ) IS NOT TRUE;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      '% livraison(s) ne respectent pas les regles de type/transporteur. Corriger les donnees avant d''appliquer la contrainte.',
      v_count;
  END IF;
END $$;

ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_carrier_check;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_carrier_check
  CHECK (
    (
      delivery_type = 'self'
      AND carrier IS NULL
      AND tracking_number IS NULL
      AND fee IS NULL
    )
    OR
    (
      delivery_type = 'carrier'
      AND carrier IS NOT NULL
      AND carrier IN ('intigo', 'navex', 'adex', 'aramex', 'bestdelivery')
      AND vendor_note IS NULL
    )
  );
