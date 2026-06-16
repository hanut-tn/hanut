-- Réparation idempotente : certaines bases existantes peuvent encore avoir
-- l'ancienne contrainte orders_status_check sans le statut 'cancelled'.
-- Dans ce cas, l'annulation d'une commande échoue avec :
-- new row for relation "orders" violates check constraint "orders_status_check".

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'new',
    'confirmed',
    'shipped',
    'delivered',
    'returned',
    'cancelled'
  ));

-- Sécurise aussi les transitions attendues par les RPC de statut.
INSERT INTO order_status_transitions (from_status, to_status)
VALUES
  ('pending', 'cancelled'),
  ('new', 'cancelled'),
  ('confirmed', 'cancelled'),
  ('returned', 'cancelled')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
