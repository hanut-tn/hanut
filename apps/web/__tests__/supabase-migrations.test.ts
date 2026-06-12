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
  const sellersRls = migration('20260609_fix_sellers_rls.sql')
  const stockVariantConsistency = migration('20260609_stock_variant_consistency.sql')
  const uniqueDeliveryOrder = migration('20260610_add_unique_delivery_order.sql')
  const orderCountTrigger = migration('20260610_fix_order_count_trigger.sql')
  const orderUnitCost = migration('20260610_add_order_unit_cost.sql')
  const consolidatedOrderRpc = migration('20260610_consolidate_order_rpc.sql')
  const cancelledStatus = migration('20260611_add_cancelled_status.sql')
  const stockSyncTrigger = migration('20260611_add_stock_sync_trigger.sql')
  const storageRls = migration('20260611_fix_storage_rls.sql')
  const operatorDeleteRls = migration('20260611_fix_operator_delete_rls.sql')
  const invitationToken = migration('20260611_add_invitation_token.sql')
  const analyticsRpc = migration('20260612_add_analytics_rpc.sql')
  const stockTriggerFix = migration('20260612_fix_stock_trigger.sql')
  const allowDeleteCancelledOrder = migration('20260612_allow_delete_cancelled_order.sql')
  const customerStatsRpc = migration('20260613_add_customer_stats_rpc.sql')
  const missingIndexes = migration('20260613_add_missing_indexes.sql')
  const updateOrderStatusRpc = migration('20260613_add_update_order_status_rpc.sql')
  const customerStatsDeliveryRateFix = migration('20260614_fix_customer_stats_delivery_rate.sql')
  const adjustStockRpc = migration('20260614_add_adjust_stock_rpc.sql')

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

  it('keeps variant stock and global stock synchronized in the latest stock RPCs', () => {
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION variant_label/i)
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION sum_variant_stock/i)
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION create_order_with_stock/i)
    expect(stockVariantConsistency).toMatch(/RAISE EXCEPTION 'Variante obligatoire'/i)
    expect(stockVariantConsistency).toMatch(/stock = v_new_stock/i)
    expect(stockVariantConsistency).toMatch(/INSERT INTO stock_movements/i)
    expect(stockVariantConsistency).toMatch(/variant_name/i)
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock/i)
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION soft_delete_order_with_stock/i)
    expect(stockVariantConsistency).toMatch(/CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock/i)
  })

  it('locks sellers RLS to owners and active team read access', () => {
    expect(sellersRls).toMatch(/ALTER TABLE sellers ENABLE ROW LEVEL SECURITY/i)
    expect(sellersRls).toMatch(/DROP POLICY IF EXISTS %I ON sellers/i)
    expect(sellersRls).toMatch(/CREATE POLICY "sellers_select_owner_or_active_team"/i)
    expect(sellersRls).toMatch(/id = auth\.uid\(\)/i)
    expect(sellersRls).toMatch(/get_team_role\(id\) IN \('admin', 'operator', 'readonly'\)/i)
    expect(sellersRls).toMatch(/CREATE POLICY "sellers_insert_own_profile"/i)
    expect(sellersRls).toMatch(/WITH CHECK \(id = auth\.uid\(\)\)/i)
    expect(sellersRls).toMatch(/CREATE POLICY "sellers_update_owner_only"/i)
    expect(sellersRls).not.toMatch(/FOR DELETE/i)
  })

  it('prevents duplicate active deliveries per order', () => {
    expect(uniqueDeliveryOrder).toMatch(/row_number\(\) OVER/i)
    expect(uniqueDeliveryOrder).toMatch(/PARTITION BY order_id/i)
    expect(uniqueDeliveryOrder).toMatch(/WHERE cod_collected = false/i)
    expect(uniqueDeliveryOrder).toMatch(/CREATE UNIQUE INDEX idx_unique_active_delivery_per_order/i)
    expect(uniqueDeliveryOrder).toMatch(/ON deliveries\(order_id\)/i)
    expect(uniqueDeliveryOrder).toMatch(/WHERE cod_collected = false/i)
  })

  it('keeps customer order_count in sync with active orders only', () => {
    expect(orderCountTrigger).toMatch(/CREATE OR REPLACE FUNCTION update_customer_order_count/i)
    expect(orderCountTrigger).toMatch(/SECURITY DEFINER/i)
    expect(orderCountTrigger).toMatch(/SET search_path = public/i)
    expect(orderCountTrigger).toMatch(/TG_OP = 'INSERT' AND NEW\.customer_id IS NOT NULL AND NEW\.deleted_at IS NULL/i)
    expect(orderCountTrigger).toMatch(/TG_OP = 'DELETE' AND OLD\.customer_id IS NOT NULL AND OLD\.deleted_at IS NULL/i)
    expect(orderCountTrigger).toMatch(/AFTER INSERT OR UPDATE OF deleted_at OR DELETE/i)
    expect(orderCountTrigger).toMatch(/EXECUTE FUNCTION update_customer_order_count\(\)/i)
  })

  it('snapshots product unit cost on orders for profit analytics', () => {
    expect(orderUnitCost).toMatch(/ADD COLUMN IF NOT EXISTS unit_cost NUMERIC/i)
    expect(orderUnitCost).toMatch(/SET unit_cost = COALESCE\(p\.cost, 0\)/i)
    expect(orderUnitCost).toMatch(/AND o\.unit_cost IS NULL/i)
    expect(orderUnitCost).toMatch(/ALTER COLUMN unit_cost SET DEFAULT 0/i)
    expect(orderUnitCost).toMatch(/ALTER COLUMN unit_cost SET NOT NULL/i)
    expect(orderUnitCost).toMatch(/orders_unit_cost_nonnegative CHECK \(unit_cost >= 0\)/i)
    expect(orderUnitCost).toMatch(/quantity, cod_amount, unit_cost, notes, status, tracking_token/i)
    expect(orderUnitCost).toMatch(/p_quantity, v_cod_amount, COALESCE\(v_product\.cost, 0\), v_notes, p_status/i)
  })

  it('consolidates the final order RPC with unit cost, tracking token, and cancelled status support', () => {
    expect(consolidatedOrderRpc).toMatch(/DROP FUNCTION IF EXISTS create_order_with_stock/i)
    expect(consolidatedOrderRpc).toMatch(/SECURITY DEFINER/i)
    expect(consolidatedOrderRpc).toMatch(/SET search_path = public/i)
    expect(consolidatedOrderRpc).toMatch(/quantity, cod_amount, unit_cost, notes, status, tracking_token/i)
    expect(consolidatedOrderRpc).toMatch(/replace\(gen_random_uuid\(\)::text, '-', ''\)/i)
    expect(consolidatedOrderRpc).toMatch(/'cancelled'/i)
    expect(consolidatedOrderRpc).toMatch(/GRANT EXECUTE ON FUNCTION create_order_with_stock[\s\S]+TO authenticated, service_role;/i)
  })

  it('adds cancelled orders without counting them as returns', () => {
    expect(cancelledStatus).toMatch(/ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check/i)
    expect(cancelledStatus).toMatch(/'cancelled'/i)
    expect(cancelledStatus).toMatch(/CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock/i)
    expect(cancelledStatus).toMatch(/SET status = 'cancelled'/i)
    expect(cancelledStatus).toMatch(/VALUES \(p_order_id, 'cancelled', p_changed_by\)/i)
  })

  it('syncs product stock from variant quantities in the database', () => {
    expect(stockSyncTrigger).toMatch(/CREATE OR REPLACE FUNCTION sync_stock_from_variants/i)
    expect(stockSyncTrigger).toMatch(/NEW\.stock := v_total_stock/i)
    expect(stockSyncTrigger).toMatch(/BEFORE UPDATE OF variants/i)
    expect(stockSyncTrigger).toMatch(/EXECUTE FUNCTION sync_stock_from_variants\(\)/i)
    expect(stockSyncTrigger).toMatch(/UPDATE products\s+SET stock =/i)
  })

  it('scopes product image storage writes to the effective seller folder', () => {
    expect(storageRls).toMatch(/DROP POLICY IF EXISTS "product_images_authenticated_upload"/i)
    expect(storageRls).toMatch(/DROP POLICY IF EXISTS "product_images_seller_upload"/i)
    expect(storageRls).toMatch(/CREATE POLICY "product_images_seller_upload"/i)
    expect(storageRls).toMatch(/CREATE POLICY "product_images_seller_update"/i)
    expect(storageRls).toMatch(/CREATE POLICY "product_images_seller_delete"/i)
    expect(storageRls).toMatch(/\(storage\.foldername\(name\)\)\[1\] = public\.get_seller_id\(\)::text/i)
    expect(storageRls).toMatch(/CREATE POLICY "product_images_public_read"/i)
  })

  it('restricts destructive deletes to the seller owner at the database layer', () => {
    expect(operatorDeleteRls).toMatch(/CREATE OR REPLACE FUNCTION is_seller_admin/i)
    expect(operatorDeleteRls).toMatch(/WHERE id = auth\.uid\(\) AND id = p_seller_id/i)
    expect(operatorDeleteRls).toMatch(/DROP POLICY IF EXISTS "orders_team_delete" ON orders/i)
    expect(operatorDeleteRls).toMatch(/DROP POLICY IF EXISTS "customers_team_delete" ON customers/i)
    expect(operatorDeleteRls).toMatch(/DROP POLICY IF EXISTS "products_team_delete" ON products/i)
    expect(operatorDeleteRls).toMatch(/DROP POLICY IF EXISTS "deliveries_team_delete" ON deliveries/i)
    expect(operatorDeleteRls).toMatch(/AND is_seller_admin\(seller_id\)/i)
    expect(operatorDeleteRls).not.toMatch(/FOR DELETE[\s\S]+can_write_seller/i)
  })

  it('adds unique invitation tokens without making null tokens collide', () => {
    expect(invitationToken).toMatch(/ADD COLUMN IF NOT EXISTS invitation_token TEXT DEFAULT NULL/i)
    expect(invitationToken).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_invitation_token/i)
    expect(invitationToken).toMatch(/ON team_members\(invitation_token\)/i)
    expect(invitationToken).toMatch(/WHERE invitation_token IS NOT NULL/i)
    expect(invitationToken).not.toMatch(/invitation_token TEXT UNIQUE/i)
  })

  it('protects the analytics summary RPC from cross-seller reads and duplicate fees', () => {
    expect(analyticsRpc).toMatch(/CREATE OR REPLACE FUNCTION get_analytics_summary/i)
    expect(analyticsRpc).toMatch(/SECURITY DEFINER/i)
    expect(analyticsRpc).toMatch(/current_setting\('request\.jwt\.claim\.role', true\)/i)
    expect(analyticsRpc).toMatch(/get_team_role\(p_seller_id\) IN \('admin', 'operator', 'readonly'\)/i)
    expect(analyticsRpc).toMatch(/RAISE EXCEPTION 'Non autorise'/i)
    expect(analyticsRpc).toMatch(/delivery_fees AS/i)
    expect(analyticsRpc).toMatch(/GROUP BY d\.order_id/i)
    expect(analyticsRpc).toMatch(/COUNT\(\*\) FILTER \(WHERE o\.status = 'shipped'\)/i)
    expect(analyticsRpc).not.toMatch(/LEFT JOIN deliveries d ON d\.order_id = o\.id AND d\.cod_collected = true/i)
  })

  it('treats negative variant quantities as zero when syncing product stock', () => {
    expect(stockTriggerFix).toMatch(/CREATE OR REPLACE FUNCTION sync_stock_from_variants/i)
    expect(stockTriggerFix).toMatch(/GREATEST\(0, \(v->>'qty'\)::INTEGER\)/i)
    expect(stockTriggerFix).toMatch(/NEW\.stock := v_total_stock/i)
  })

  it('allows trashing resolved orders without restoring stock again', () => {
    expect(allowDeleteCancelledOrder).toMatch(/CREATE OR REPLACE FUNCTION soft_delete_order_with_stock/i)
    expect(allowDeleteCancelledOrder).toMatch(/current_setting\('request\.jwt\.claim\.role', true\)/i)
    expect(allowDeleteCancelledOrder).toMatch(/get_team_role\(p_seller_id\) = 'admin'/i)
    expect(allowDeleteCancelledOrder).toMatch(/RAISE EXCEPTION 'Non autorise'/i)
    expect(allowDeleteCancelledOrder).toMatch(
      /v_order\.status NOT IN \('pending', 'new', 'confirmed', 'delivered', 'returned', 'cancelled'\)/i
    )
    expect(allowDeleteCancelledOrder).toMatch(/v_seller_plan = 'starter'/i)
    expect(allowDeleteCancelledOrder).toMatch(/v_order\.status IN \('delivered', 'returned', 'cancelled'\)/i)
    expect(allowDeleteCancelledOrder).toMatch(/RAISE EXCEPTION 'CANNOT_DELETE'/i)
    expect(allowDeleteCancelledOrder).toMatch(/IF v_order\.status IN \('pending', 'new', 'confirmed'\) THEN/i)
    expect(allowDeleteCancelledOrder).toMatch(/PERFORM adjust_order_stock/i)
    expect(allowDeleteCancelledOrder).not.toMatch(/'shipped'/i)
    expect(allowDeleteCancelledOrder).toMatch(/GRANT EXECUTE ON FUNCTION soft_delete_order_with_stock\(UUID, UUID, UUID\) TO authenticated, service_role/i)
  })

  it('protects customer stats aggregation by seller access', () => {
    expect(customerStatsRpc).toMatch(/CREATE OR REPLACE FUNCTION get_customer_stats/i)
    expect(customerStatsRpc).toMatch(/SECURITY DEFINER/i)
    expect(customerStatsRpc).toMatch(/current_setting\('request\.jwt\.claim\.role', true\)/i)
    expect(customerStatsRpc).toMatch(/get_team_role\(p_seller_id\) IN \('admin', 'operator', 'readonly'\)/i)
    expect(customerStatsRpc).toMatch(/WHERE o\.customer_id = p_customer_id/i)
    expect(customerStatsRpc).toMatch(/AND o\.seller_id = p_seller_id/i)
    expect(customerStatsRpc).toMatch(/AND o\.deleted_at IS NULL/i)
    expect(customerStatsRpc).toMatch(/REVOKE ALL ON FUNCTION get_customer_stats\(UUID, UUID\) FROM PUBLIC/i)
  })

  it('adds indexes matching dashboard, analytics, and customer detail queries', () => {
    expect(missingIndexes).toMatch(/CREATE INDEX IF NOT EXISTS idx_orders_seller_created/i)
    expect(missingIndexes).toMatch(/ON orders\(seller_id, created_at DESC\)/i)
    expect(missingIndexes).toMatch(/WHERE deleted_at IS NULL/i)
    expect(missingIndexes).toMatch(/CREATE INDEX IF NOT EXISTS idx_orders_seller_customer_created/i)
    expect(missingIndexes).toMatch(/ON orders\(seller_id, customer_id, created_at DESC\)/i)
    expect(missingIndexes).toMatch(/CREATE INDEX IF NOT EXISTS idx_deliveries_created_at/i)
  })

  it('updates order status atomically without bypassing seller permissions', () => {
    expect(updateOrderStatusRpc).toMatch(/CREATE OR REPLACE FUNCTION update_order_status/i)
    expect(updateOrderStatusRpc).toMatch(/SECURITY DEFINER/i)
    expect(updateOrderStatusRpc).toMatch(/can_write_seller\(p_seller_id\)/i)
    expect(updateOrderStatusRpc).toMatch(/RAISE EXCEPTION 'Non autorise'/i)
    expect(updateOrderStatusRpc).toMatch(/p_new_status NOT IN \('pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled'\)/i)
    expect(updateOrderStatusRpc).toMatch(/RAISE EXCEPTION 'INVALID_STATUS'/i)
    expect(updateOrderStatusRpc).toMatch(/AND deleted_at IS NULL/i)
    expect(updateOrderStatusRpc).toMatch(/FOR UPDATE/i)
    expect(updateOrderStatusRpc).toMatch(/VALUES \(p_order_id, p_new_status, v_actor\)/i)
    expect(updateOrderStatusRpc).toMatch(/REVOKE ALL ON FUNCTION update_order_status\(UUID, UUID, TEXT, UUID\) FROM PUBLIC/i)
  })

  it('keeps customer delivery rate compatible with the original customer page metric', () => {
    expect(customerStatsDeliveryRateFix).toMatch(/CREATE OR REPLACE FUNCTION get_customer_stats/i)
    expect(customerStatsDeliveryRateFix).toMatch(/SECURITY DEFINER/i)
    expect(customerStatsDeliveryRateFix).toMatch(/get_team_role\(p_seller_id\) IN \('admin', 'operator', 'readonly'\)/i)
    expect(customerStatsDeliveryRateFix).toMatch(/WITH order_base AS/i)
    expect(customerStatsDeliveryRateFix).toMatch(/'order_count', COUNT\(\*\)/i)
    expect(customerStatsDeliveryRateFix).toMatch(/COUNT\(\*\) FILTER \(WHERE status = 'delivered'\)::NUMERIC \/\s*COUNT\(\*\) \* 100/i)
    expect(customerStatsDeliveryRateFix).toMatch(/REVOKE ALL ON FUNCTION get_customer_stats\(UUID, UUID\) FROM PUBLIC/i)
  })

  it('adjusts product stock atomically without masking negative stock races', () => {
    expect(adjustStockRpc).toMatch(/CREATE OR REPLACE FUNCTION adjust_product_stock/i)
    expect(adjustStockRpc).toMatch(/SECURITY DEFINER/i)
    expect(adjustStockRpc).toMatch(/can_write_seller\(p_seller_id\)/i)
    expect(adjustStockRpc).toMatch(/FOR UPDATE/i)
    expect(adjustStockRpc).toMatch(/variant_label\(elem, ord\) = p_variant_name/i)
    expect(adjustStockRpc).toMatch(/RAISE EXCEPTION 'VARIANT_NOT_FOUND'/i)
    expect(adjustStockRpc).toMatch(/RAISE EXCEPTION 'VARIANT_AMBIGUOUS'/i)
    expect(adjustStockRpc).toMatch(/RAISE EXCEPTION 'INSUFFICIENT_STOCK'/i)
    expect(adjustStockRpc).not.toMatch(/GREATEST\(0, \(elem->>'qty'\)::INTEGER \+ p_delta\)/i)
    expect(adjustStockRpc).not.toMatch(/v_new_stock := GREATEST\(0, v_product\.stock \+ p_delta\)/i)
    expect(adjustStockRpc).toMatch(/INSERT INTO stock_movements/i)
    expect(adjustStockRpc).toMatch(/REVOKE ALL ON FUNCTION adjust_product_stock\(UUID, UUID, TEXT, INTEGER, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT\) FROM PUBLIC/i)
  })
})
