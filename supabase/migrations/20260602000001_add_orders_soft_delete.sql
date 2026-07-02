-- Soft-delete pour les commandes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(seller_id, deleted_at) WHERE deleted_at IS NULL;
