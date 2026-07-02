-- Retire l'exigence du repère livreur dans les contraintes d'adresse structurée.
-- customer_addresses_structured_address_required et orders_structured_address_required
-- exigeaient customer_landmark non-null en mode v2, bloquant toutes les commandes sans repère.

ALTER TABLE customer_addresses
DROP CONSTRAINT IF EXISTS customer_addresses_structured_address_required;

ALTER TABLE customer_addresses
ADD CONSTRAINT customer_addresses_structured_address_required CHECK (
  address_version IS NULL
  OR address_version < 2
  OR (
    customer_governorate IS NOT NULL
    AND customer_city     IS NOT NULL
    AND customer_address  IS NOT NULL
    -- customer_landmark est volontairement exclu : optionnel
  )
);

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_structured_address_required;

ALTER TABLE orders
ADD CONSTRAINT orders_structured_address_required CHECK (
  address_version IS NULL
  OR address_version < 2
  OR (
    customer_governorate IS NOT NULL
    AND customer_city     IS NOT NULL
    AND customer_address  IS NOT NULL
    -- customer_landmark est volontairement exclu : optionnel
  )
);
