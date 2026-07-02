-- Index pour les jointures sur customer_id
-- (queries fiche client, orders par client dans customers_with_stats)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id_seller
ON orders(customer_id, seller_id)
WHERE deleted_at IS NULL;

-- Index pour les recherches de membres équipe par email (invitations pending)
CREATE INDEX IF NOT EXISTS idx_team_members_email
ON team_members(email)
WHERE status = 'pending';

ANALYZE orders;
ANALYZE team_members;
