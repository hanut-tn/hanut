-- Complète 20260743000000_landmark_constraint_fix.sql : cette contrainte existe
-- aussi sur customers (oubliée), pas seulement sur orders et customer_addresses.
-- create_order_with_items insère/met à jour customers avec un landmark
-- potentiellement NULL, ce qui violait encore customers_structured_address_required.

ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_structured_address_required;

ALTER TABLE customers
ADD CONSTRAINT customers_structured_address_required CHECK (
  address_version IS NULL
  OR address_version < 2
  OR (
    customer_governorate IS NOT NULL
    AND customer_city     IS NOT NULL
    AND customer_address  IS NOT NULL
    -- customer_landmark est volontairement exclu : optionnel
  )
);
