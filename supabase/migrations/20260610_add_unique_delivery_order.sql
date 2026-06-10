-- Empêcher qu'une commande ait deux livraisons actives simultanément.
-- Une livraison "active" = cod_collected = false.
-- Les livraisons avec cod_collected = true sont des archives comptables
-- et peuvent coexister (ex : retour + nouvelle tentative de livraison).

DO $$
BEGIN
  -- Supprimer les doublons éventuels avant d'ajouter la contrainte.
  -- Pour chaque order_id ayant plusieurs livraisons actives, on garde la plus récente.
  -- Le tri par id rend le nettoyage déterministe même si created_at est identique.
  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY order_id
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM deliveries
    WHERE cod_collected = false
  )
  DELETE FROM deliveries d
  USING ranked r
  WHERE d.id = r.id
    AND r.rn > 1;

  -- Ajouter l'index UNIQUE partiel si inexistant.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'deliveries'
      AND indexname = 'idx_unique_active_delivery_per_order'
  ) THEN
    CREATE UNIQUE INDEX idx_unique_active_delivery_per_order
    ON deliveries(order_id)
    WHERE cod_collected = false;
  END IF;
END $$;
