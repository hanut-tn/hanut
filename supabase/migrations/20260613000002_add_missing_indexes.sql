-- Index manquants identifiés lors de l'audit performance.

-- Queries analytics et dashboard : filtres temporels par seller
CREATE INDEX IF NOT EXISTS idx_orders_seller_created
ON orders(seller_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Jointures customers/[id] : commandes d'un client dans une boutique
CREATE INDEX IF NOT EXISTS idx_orders_seller_customer_created
ON orders(seller_id, customer_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Queries analytics : filtre temporel sur deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at
ON deliveries(created_at);

ANALYZE orders;
ANALYZE deliveries;
