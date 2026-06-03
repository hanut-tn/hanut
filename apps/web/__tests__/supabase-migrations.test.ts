import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function migration(pathname: string) {
  return readFileSync(resolve(repoRoot, 'supabase/migrations', pathname), 'utf8')
}

describe('Supabase migrations', () => {
  const appSchema = migration('20260601_add_missing_app_schema.sql')
  const orderRpc = migration('20260601_create_order_with_stock_rpc.sql')
  const teamMembers = migration('20260602_add_team_members.sql')
  const activityLogs = migration('20260602_add_activity_logs.sql')
  const orderSoftDelete = migration('20260602_add_orders_soft_delete.sql')
  const productsDescription = migration('20260602_add_products_description.sql')
  const onboarding = migration('20260603_add_onboarding.sql')
  const rateLimits = migration('20260603_add_rate_limits.sql')
  const orderSearch = migration('20260603_search_orders_rpc.sql')

  it('adds the public shop, customer metadata, pending order status, and marketing tables', () => {
    expect(appSchema).toMatch(/ALTER TABLE sellers\s+ADD COLUMN IF NOT EXISTS slug TEXT;/i)
    expect(appSchema).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_slug_unique\s+ON sellers\(slug\)\s+WHERE slug IS NOT NULL;/i
    )
    expect(appSchema).toMatch(
      /ADD COLUMN IF NOT EXISTS tags TEXT\[\] NOT NULL DEFAULT '\{\}',\s+ADD COLUMN IF NOT EXISTS notes TEXT;/i
    )
    expect(appSchema).toMatch(
      /CHECK \(status IN \('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'\)\);/i
    )
    expect(appSchema).toMatch(/CREATE TABLE IF NOT EXISTS waitlist/i)
    expect(appSchema).toMatch(/CREATE TABLE IF NOT EXISTS contact_messages/i)
  })

  it('keeps useful constraints and indexes for the added schema', () => {
    expect(appSchema).toMatch(/products_stock_nonnegative CHECK \(stock >= 0\)/i)
    expect(appSchema).toMatch(/orders_quantity_positive CHECK \(quantity > 0\)/i)
    expect(appSchema).toMatch(/idx_customers_seller_phone\s+ON customers\(seller_id, phone\);/i)
    expect(appSchema).toMatch(/idx_orders_seller_status\s+ON orders\(seller_id, status\);/i)
    expect(appSchema).toMatch(/idx_waitlist_created_at\s+ON waitlist\(created_at DESC\);/i)
    expect(appSchema).toMatch(
      /idx_contact_messages_created_at\s+ON contact_messages\(created_at DESC\);/i
    )
  })

  it('creates an atomic order RPC that validates seller ownership and stock before decrementing', () => {
    expect(orderRpc).toMatch(/CREATE OR REPLACE FUNCTION create_order_with_stock/i)
    expect(orderRpc).toMatch(/SET search_path = public/i)
    expect(orderRpc).toMatch(
      /FROM products\s+WHERE id = p_product_id\s+AND seller_id = p_seller_id\s+FOR UPDATE;/i
    )
    expect(orderRpc).toMatch(/IF v_product\.stock < p_quantity THEN/i)
    expect(orderRpc).toMatch(/SET stock = stock - p_quantity/i)
    expect(orderRpc).toMatch(/p_status TEXT DEFAULT 'new'/i)
    expect(orderRpc).toMatch(
      /p_status NOT IN \('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'\)/i
    )
    expect(orderRpc).toMatch(/p_notes TEXT DEFAULT NULL/i)
  })

  it('keeps RPC execution locked down to authenticated clients and service role', () => {
    expect(orderRpc).toMatch(/REVOKE ALL ON FUNCTION create_order_with_stock[\s\S]+FROM PUBLIC;/i)
    expect(orderRpc).toMatch(
      /GRANT EXECUTE ON FUNCTION create_order_with_stock[\s\S]+TO authenticated, service_role;/i
    )
  })

  it('adds team members with role-aware RLS helpers and policies', () => {
    expect(teamMembers).toMatch(/CREATE TABLE IF NOT EXISTS team_members/i)
    expect(teamMembers).toMatch(/role\s+TEXT NOT NULL CHECK \(role IN \('admin', 'operator', 'readonly'\)\)/i)
    expect(teamMembers).toMatch(/CREATE OR REPLACE FUNCTION get_seller_id\(\)/i)
    expect(teamMembers).toMatch(/CREATE OR REPLACE FUNCTION get_team_role\(p_seller_id UUID\)/i)
    expect(teamMembers).toMatch(/CREATE OR REPLACE FUNCTION can_write_seller\(p_seller_id UUID\)/i)
    expect(teamMembers).toMatch(/DROP POLICY IF EXISTS "orders_team_read" ON orders;/i)
    expect(teamMembers).toMatch(/CREATE POLICY "orders_team_insert" ON orders FOR INSERT/i)
    expect(teamMembers).toMatch(/CREATE POLICY "customers_team_delete" ON customers FOR DELETE/i)
    expect(teamMembers).toMatch(/CREATE POLICY "products_team_delete" ON products FOR DELETE/i)
    expect(teamMembers).toMatch(/CREATE POLICY "deliveries_team_update" ON deliveries FOR UPDATE/i)
    expect(teamMembers).toMatch(/CREATE POLICY "deliveries_team_delete" ON deliveries FOR DELETE/i)
  })

  it('adds activity logs for team audit history', () => {
    expect(activityLogs).toMatch(/CREATE TABLE IF NOT EXISTS activity_logs/i)
    expect(activityLogs).toMatch(/seller_id\s+UUID NOT NULL REFERENCES sellers\(id\) ON DELETE CASCADE/i)
    expect(activityLogs).toMatch(/action_type TEXT NOT NULL/i)
    expect(activityLogs).toMatch(/metadata\s+JSONB NOT NULL DEFAULT '\{\}'/i)
    expect(activityLogs).toMatch(/ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY/i)
    expect(activityLogs).toMatch(/CREATE POLICY "activity_logs_team_read" ON activity_logs FOR SELECT/i)
    expect(activityLogs).toMatch(/CREATE POLICY "activity_logs_team_insert" ON activity_logs FOR INSERT/i)
    expect(activityLogs).toMatch(/idx_activity_logs_seller_created/i)
  })

  it('adds soft-delete metadata for the order trash', () => {
    expect(orderSoftDelete).toMatch(
      /ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;/i
    )
    expect(orderSoftDelete).toMatch(
      /ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth\.users\(id\) DEFAULT NULL;/i
    )
    expect(orderSoftDelete).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders\(seller_id, deleted_at\) WHERE deleted_at IS NULL;/i
    )
  })

  it('adds product descriptions and image storage policies', () => {
    expect(productsDescription).toMatch(
      /ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;/i
    )
    expect(productsDescription).toMatch(/INSERT INTO storage\.buckets/i)
    expect(productsDescription).toMatch(/'product-images'/i)
    expect(productsDescription).toMatch(/CREATE POLICY "product_images_public_read"/i)
    expect(productsDescription).toMatch(/CREATE POLICY "product_images_authenticated_upload"/i)
    expect(productsDescription).toMatch(/CREATE POLICY "product_images_authenticated_update"/i)
    expect(productsDescription).toMatch(/CREATE POLICY "product_images_authenticated_delete"/i)
  })

  it('adds seller onboarding state', () => {
    expect(onboarding).toMatch(
      /ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;/i
    )
    expect(onboarding).toMatch(
      /ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_steps JSONB NOT NULL DEFAULT '\{"product_added": false, "link_copied": false, "first_order": false\}'::jsonb;/i
    )
  })

  it('adds atomic service-role rate limiting', () => {
    expect(rateLimits).toMatch(/CREATE TABLE IF NOT EXISTS rate_limits/i)
    expect(rateLimits).toMatch(/UNIQUE\(identifier, endpoint\)/i)
    expect(rateLimits).toMatch(/ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY/i)
    expect(rateLimits).toMatch(/CREATE OR REPLACE FUNCTION check_rate_limit/i)
    expect(rateLimits).toMatch(/FOR UPDATE/i)
    expect(rateLimits).toMatch(/REVOKE ALL ON FUNCTION check_rate_limit\(TEXT, TEXT, INTEGER, INTEGER\) FROM PUBLIC;/i)
    expect(rateLimits).toMatch(/GRANT EXECUTE ON FUNCTION check_rate_limit\(TEXT, TEXT, INTEGER, INTEGER\) TO service_role;/i)
  })

  it('adds an order search RPC that safely matches UUID prefixes as text', () => {
    expect(orderSearch).toMatch(/CREATE OR REPLACE FUNCTION search_orders/i)
    expect(orderSearch).toMatch(/SECURITY INVOKER/i)
    expect(orderSearch).toMatch(/o\.id::text ILIKE btrim\(p_search\) \|\| '%'/i)
    expect(orderSearch).toMatch(/o\.customer_id = ANY\(p_customer_ids\)/i)
    expect(orderSearch).toMatch(
      /GRANT EXECUTE ON FUNCTION search_orders\(UUID, TEXT, UUID\[\], INTEGER\) TO authenticated, service_role;/i
    )
  })
})
