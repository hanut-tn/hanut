-- ─── Données de test Hanut ───────────────────────────────────────────────────
-- Usage automatique : supabase start applique ce fichier après les migrations.
-- Usage manuel     : psql $DATABASE_URL -f supabase/seed.sql
--
-- Idempotent (ON CONFLICT DO NOTHING sur UUIDs fixes).
-- NE PAS exécuter en production.

DO $$
DECLARE
  v_seller_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_customer1   UUID := '00000000-0000-0000-0000-000000000010';
  v_customer2   UUID := '00000000-0000-0000-0000-000000000011';
  v_customer3   UUID := '00000000-0000-0000-0000-000000000012';
  v_product1    UUID := '00000000-0000-0000-0000-000000000020';
  v_product2    UUID := '00000000-0000-0000-0000-000000000021';
  v_product3    UUID := '00000000-0000-0000-0000-000000000022';
  v_product4    UUID := '00000000-0000-0000-0000-000000000023';
  v_product5    UUID := '00000000-0000-0000-0000-000000000024';
  v_order1      UUID := '00000000-0000-0000-0001-000000000001';
  v_order2      UUID := '00000000-0000-0000-0001-000000000002';
  v_order3      UUID := '00000000-0000-0000-0001-000000000003';
  v_order4      UUID := '00000000-0000-0000-0001-000000000004';
  v_order5      UUID := '00000000-0000-0000-0001-000000000005';
  v_order6      UUID := '00000000-0000-0000-0001-000000000006';
  v_order7      UUID := '00000000-0000-0000-0001-000000000007';
BEGIN

  -- ── Vendeur de test ──────────────────────────────────────────────────────
  INSERT INTO sellers (id, email, name, slug, plan, subscription_status, subscription_end)
  VALUES (
    v_seller_id,
    'demo@hanut.tn',
    'Boutique Test Hanut',
    'test-hanut',
    'pro',
    'active',
    now() + interval '365 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── Produits ─────────────────────────────────────────────────────────────
  -- Colonnes réelles : id, seller_id, name, price, cost, stock
  INSERT INTO products (id, seller_id, name, price, cost, stock) VALUES
    (v_product1, v_seller_id, 'Chemise Lin Blanc',   89.00,  35.00, 42),
    (v_product2, v_seller_id, 'Pantalon Cargo Kaki', 125.00, 55.00, 18),
    (v_product3, v_seller_id, 'Robe Été Fleurie',    145.00, 62.00,  7),
    (v_product4, v_seller_id, 'Sneakers Blanc Cuir', 195.00, 88.00,  0),
    (v_product5, v_seller_id, 'Sac Cabas Beige',     210.00, 95.00, 23)
  ON CONFLICT (id) DO NOTHING;

  -- ── Clients ──────────────────────────────────────────────────────────────
  INSERT INTO customers (id, seller_id, name, phone, city, customer_governorate, customer_city, customer_delegation) VALUES
    (v_customer1, v_seller_id, 'Sarra Ben Ali',    '22345678', 'Tunis',  'Tunis',  'Tunis',  'La Marsa'),
    (v_customer2, v_seller_id, 'Mohamed Trabelsi', '55987654', 'Sfax',   'Sfax',   'Sfax',   'Sfax Sud'),
    (v_customer3, v_seller_id, 'Amira Jouini',     '98765432', 'Sousse', 'Sousse', 'Sousse', 'Hammam Sousse')
  ON CONFLICT (id) DO NOTHING;

  -- ── Commandes ────────────────────────────────────────────────────────────
  -- Colonnes de base uniquement (customer_name/phone ne sont pas des colonnes)
  INSERT INTO orders (id, seller_id, customer_id, product_id, quantity, cod_amount, status, created_at) VALUES
    (v_order1, v_seller_id, v_customer1, v_product1, 2, 178.00, 'delivered', now() - interval '15 days'),
    (v_order2, v_seller_id, v_customer2, v_product2, 1, 125.00, 'delivered', now() - interval '10 days'),
    (v_order3, v_seller_id, v_customer3, v_product3, 1, 145.00, 'shipped',   now() - interval '3 days'),
    (v_order4, v_seller_id, v_customer1, v_product5, 1, 210.00, 'confirmed', now() - interval '1 day'),
    (v_order5, v_seller_id, v_customer2, v_product4, 1, 195.00, 'pending',   now() - interval '2 hours'),
    (v_order6, v_seller_id, v_customer3, v_product1, 1,  89.00, 'returned',  now() - interval '20 days'),
    (v_order7, v_seller_id, v_customer2, v_product3, 2, 290.00, 'cancelled', now() - interval '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── Livraisons ───────────────────────────────────────────────────────────
  -- order1 : COD collecté et reversé
  INSERT INTO deliveries (order_id, delivery_type, carrier, fee, cod_collected, cod_reversed)
  VALUES (v_order1, 'carrier', 'aramex', 7.00, true, true)
  ON CONFLICT DO NOTHING;

  -- order2 : COD collecté mais pas encore reversé
  INSERT INTO deliveries (order_id, delivery_type, carrier, fee, cod_collected, cod_reversed)
  VALUES (v_order2, 'carrier', 'aramex', 7.00, true, false)
  ON CONFLICT DO NOTHING;

  -- order3 : en cours, COD pas encore collecté
  INSERT INTO deliveries (order_id, delivery_type, carrier, fee, cod_collected, cod_reversed)
  VALUES (v_order3, 'carrier', 'intigo', 8.00, false, false)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed Hanut :';
  RAISE NOTICE '   1 vendeur · 5 produits · 3 clients · 7 commandes · 3 livraisons';
END $$;
