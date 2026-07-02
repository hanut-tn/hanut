-- Corriger sync_stock_from_variants() pour traiter les qty négatives comme 0.
-- Sans GREATEST(0, qty), une variante avec qty < 0 (corruption manuelle en DB)
-- pouvait rendre products.stock négatif malgré la contrainte CHECK stock >= 0.

CREATE OR REPLACE FUNCTION sync_stock_from_variants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock INTEGER;
BEGIN
  IF NEW.variants IS NOT NULL
    AND jsonb_array_length(NEW.variants) > 0
  THEN
    SELECT COALESCE(SUM(
      GREATEST(0, (v->>'qty')::INTEGER)
    ), 0)
    INTO v_total_stock
    FROM jsonb_array_elements(NEW.variants) AS v
    WHERE (v->>'qty') IS NOT NULL;

    IF NEW.stock IS DISTINCT FROM v_total_stock THEN
      NEW.stock := v_total_stock;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
