-- ─── Données de test Hanut ───────────────────────────────────────────────────
-- Usage : Supabase Dashboard → SQL Editor → Exécuter ce fichier
--         OU : psql $DATABASE_URL -f supabase/seed.sql
--
-- Prérequis : schéma et migrations déjà appliqués.
-- Ce seed est idempotent (ON CONFLICT DO NOTHING sur les UUIDs fixes).
-- NE PAS exécuter en production.

-- UUIDs fixes pour reproductibilité
DO $$
DECLARE
  v_seller_id      UUID := '00000000-0000-0000-0000-000000000001';
  v_seller_user_id UUID := '00000000-0000-0000-0000-000000000002';
  v_customer1_id   UUID := '00000000-0000-0000-0000-000000000010';
  v_customer2_id   UUID := '00000000-0000-0000-0000-000000000011';
  v_customer3_id   UUID := '00000000-0000-0000-0000-000000000012';
  v_product1_id    UUID := '00000000-0000-0000-0000-000000000020';
  v_product2_id    UUID := '00000000-0000-0000-0000-000000000021';
  v_product3_id    UUID := '00000000-0000-0000-0000-000000000022';
  v_product4_id    UUID := '00000000-0000-0000-0000-000000000023';
  v_product5_id    UUID := '00000000-0000-0000-0000-000000000024';
BEGIN

  -- ── Vendeur de test ──────────────────────────────────────────────────────
  INSERT INTO sellers (
    id, user_id, shop_name, slug,
    subscription_status, subscription_end, plan,
    phone, address
  ) VALUES (
    v_seller_id,
    v_seller_user_id,
    'Boutique Test Hanut',
    'test-hanut',
    'active',
    now() + interval '365 days',
    'pro',
    '20123456',
    'Tunis, Tunisie'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── Clients ──────────────────────────────────────────────────────────────
  INSERT INTO customers (id, seller_id, name, phone, email, customer_governorate, customer_city, customer_delegation, tags) VALUES
    (v_customer1_id, v_seller_id, 'Sarra Ben Ali',    '22345678', 'sarra@example.com',  'Tunis',   'Tunis',    'La Marsa',     '[]'::jsonb),
    (v_customer2_id, v_seller_id, 'Mohamed Trabelsi', '55987654', NULL,                  'Sfax',    'Sfax',     'Sfax Sud',     '[]'::jsonb),
    (v_customer3_id, v_seller_id, 'Amira Jouini',     '98765432', 'amira@example.com',  'Sousse',  'Sousse',   'Hammam Sousse','[]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- ── Produits ─────────────────────────────────────────────────────────────
  INSERT INTO products (id, seller_id, name, price, unit_cost, stock, active) VALUES
    (v_product1_id, v_seller_id, 'Chemise Lin Blanc',     89.000, 35.000, 42,  true),
    (v_product2_id, v_seller_id, 'Pantalon Cargo Kaki',   125.000,55.000, 18,  true),
    (v_product3_id, v_seller_id, 'Robe Été Fleurie',      145.000,62.000, 7,   true),
    (v_product4_id, v_seller_id, 'Sneakers Blanc Cuir',   195.000,88.000, 0,   true),
    (v_product5_id, v_seller_id, 'Sac Cabas Beige',       210.000,95.000, 23,  true)
  ON CONFLICT (id) DO NOTHING;

  -- ── Commandes ────────────────────────────────────────────────────────────
  -- Status variés : pending, confirmed, shipped, delivered, returned, cancelled

  -- Commande 1 : delivered (Sarra, Chemise)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000001',
    v_seller_id, v_customer1_id, v_product1_id,
    'Sarra Ben Ali', '22345678',
    'Tunis', 'Tunis', 'La Marsa',
    2, 178.000, 35.000, 'delivered',
    now() - interval '15 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 2 : delivered (Mohamed, Pantalon)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000002',
    v_seller_id, v_customer2_id, v_product2_id,
    'Mohamed Trabelsi', '55987654',
    'Sfax', 'Sfax', 'Sfax Sud',
    1, 125.000, 55.000, 'delivered',
    now() - interval '10 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 3 : shipped (Amira, Robe)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000003',
    v_seller_id, v_customer3_id, v_product3_id,
    'Amira Jouini', '98765432',
    'Sousse', 'Sousse', 'Hammam Sousse',
    1, 145.000, 62.000, 'shipped',
    now() - interval '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 4 : confirmed (Sarra, Sac)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000004',
    v_seller_id, v_customer1_id, v_product5_id,
    'Sarra Ben Ali', '22345678',
    'Tunis', 'Tunis', 'La Marsa',
    1, 210.000, 95.000, 'confirmed',
    now() - interval '1 day'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 5 : pending (Mohamed, Sneakers)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000005',
    v_seller_id, v_customer2_id, v_product4_id,
    'Mohamed Trabelsi', '55987654',
    'Sfax', 'Sfax', 'Sfax Sud',
    1, 195.000, 88.000, 'pending',
    now() - interval '2 hours'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 6 : returned (Amira, Chemise)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000006',
    v_seller_id, v_customer3_id, v_product1_id,
    'Amira Jouini', '98765432',
    'Sousse', 'Sousse', 'Hammam Sousse',
    1, 89.000, 35.000, 'returned',
    now() - interval '20 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Commande 7 : cancelled (Mohamed, Robe)
  INSERT INTO orders (
    id, seller_id, customer_id, product_id,
    customer_name, customer_phone,
    customer_governorate, customer_city, customer_delegation,
    quantity, cod_amount, unit_cost, status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0001-000000000007',
    v_seller_id, v_customer2_id, v_product3_id,
    'Mohamed Trabelsi', '55987654',
    'Sfax', 'Sfax', 'Sfax Sud',
    2, 290.000, 62.000, 'cancelled',
    now() - interval '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── Livraisons ───────────────────────────────────────────────────────────

  -- Livraison commande 1 (delivered — COD collecté ET reversé)
  INSERT INTO deliveries (
    id, seller_id, order_id,
    delivery_type, carrier, fee,
    cod_collected, cod_reversed,
    created_at
  ) VALUES (
    '00000000-0000-0000-0002-000000000001',
    v_seller_id,
    '00000000-0000-0000-0001-000000000001',
    'carrier', 'Aramex', 7.000,
    true, true,
    now() - interval '14 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Livraison commande 2 (delivered — COD collecté mais PAS encore reversé)
  INSERT INTO deliveries (
    id, seller_id, order_id,
    delivery_type, carrier, fee,
    cod_collected, cod_reversed,
    created_at
  ) VALUES (
    '00000000-0000-0000-0002-000000000002',
    v_seller_id,
    '00000000-0000-0000-0001-000000000002',
    'carrier', 'Aramex', 7.000,
    true, false,
    now() - interval '9 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Livraison commande 3 (shipped — en cours, COD pas encore collecté)
  INSERT INTO deliveries (
    id, seller_id, order_id,
    delivery_type, carrier, fee,
    cod_collected, cod_reversed,
    created_at
  ) VALUES (
    '00000000-0000-0000-0002-000000000003',
    v_seller_id,
    '00000000-0000-0000-0001-000000000003',
    'carrier', 'Topnet Express', 8.000,
    false, false,
    now() - interval '2 days'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Seed Hanut appliqué avec succès :';
  RAISE NOTICE '   - 1 vendeur de test (ID: %)', v_seller_id;
  RAISE NOTICE '   - 3 clients';
  RAISE NOTICE '   - 5 produits';
  RAISE NOTICE '   - 7 commandes (delivered×2, shipped×1, confirmed×1, pending×1, returned×1, cancelled×1)';
  RAISE NOTICE '   - 3 livraisons (COD reversé×1, COD non reversé×1, en cours×1)';
END $$;
