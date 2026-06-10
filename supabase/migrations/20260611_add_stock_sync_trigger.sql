-- Trigger BEFORE UPDATE sur products.variants pour synchroniser
-- automatiquement products.stock = SUM(variants[].qty).
-- Remplace le recalcul applicatif non atomique.

CREATE OR REPLACE FUNCTION sync_stock_from_variants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock INTEGER;
BEGIN
  IF NEW.variants IS NOT NULL AND jsonb_array_length(NEW.variants) > 0 THEN
    SELECT COALESCE(SUM((v->>'qty')::INTEGER), 0)
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

DROP TRIGGER IF EXISTS trg_sync_stock_from_variants ON products;

CREATE TRIGGER trg_sync_stock_from_variants
BEFORE UPDATE OF variants
ON products
FOR EACH ROW
EXECUTE FUNCTION sync_stock_from_variants();

-- Resynchroniser tous les produits existants avec variantes.
UPDATE products
SET stock = (
  SELECT COALESCE(SUM((v->>'qty')::INTEGER), 0)
  FROM jsonb_array_elements(variants) AS v
  WHERE (v->>'qty') IS NOT NULL
)
WHERE variants IS NOT NULL
  AND jsonb_array_length(variants) > 0;
