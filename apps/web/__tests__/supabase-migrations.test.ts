// ⚠️ IMPORTANT — Valeur limitée de ces tests
//
// Ces tests vérifient le TEXTE des fichiers de migration
// (présence de mots-clés, signatures de fonctions).
// Ils ne détectent PAS :
// - Les problèmes d'ordre d'exécution (forward-references)
// - Les conflits de triggers (double comptage)
// - Le comportement réel des RPCs et policies RLS
//
// Les tests de comportement réels sont dans :
//   __tests__/integration/migrations-sanity.test.ts
// Exécuter avec : npm run test:integration
//
// Ces tests regex sont conservés comme documentation
// mais ne doivent pas être considérés comme une
// garantie de bon fonctionnement de la DB.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function migration(pathname: string) {
  return readFileSync(resolve(repoRoot, 'supabase/migrations', pathname), 'utf8')
}

describe('Supabase migrations', () => {
  const baseTables = migration('20260101_base_tables.sql')
  const appSchema = migration('20260601_add_missing_app_schema.sql')
  const orderRpc = migration('20260601_create_order_with_stock_rpc.sql')
  const teamMembers = migration('20260602_add_team_members.sql')
  const activityLogs = migration('20260602_z_add_activity_logs.sql')
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
  const adjustStockDeltaFix = migration('20260628_fix_adjust_stock_delta.sql')
  const secureOrderRpc = migration('20260620_secure_order_rpc.sql')
  const secureDeliveryRpcs = migration('20260621_secure_delivery_rpcs.sql')
  const statusTransitions = migration('20260622_add_status_transitions.sql')
  const codReversalHistory = migration('20260623_add_cod_reversal_history.sql')
  const doubleOrderCountFix = migration('20260624_fix_double_order_count_trigger.sql')
  const analyticsExportRpc = migration('20260625_add_analytics_export_rpc.sql')
  const apiRolePrivileges = migration('20260626_restore_api_role_privileges.sql')
  const serviceRoleDetection = migration('20260627_fix_service_role_detection.sql')
  const anonymizeCustomerMigration = migration('20260629_anonymize_customer.sql')
  const anonymizeCustomerTagsTypeFix = migration('20260702_fix_anonymize_customer_tags_type.sql')
  const anonymizeCustomerEntityTypeFix = migration('20260703_fix_anonymize_customer_activity_entity_type.sql')
  const codSummaryMigration = migration('20260630_get_cod_summary.sql')
  const deliveryTypeMigration = migration('20260701_add_delivery_type.sql')
  const dashboardKpisMigration = migration('20260704_add_dashboard_kpis_rpc.sql')
  const activityLogIndexesMigration = migration('20260705_add_activity_logs_indexes.sql')
  const carrierConstraintMigration = migration('20260706_fix_carrier_constraint.sql')
  const customerCursorMigration = migration('20260707_customers_cursor_page.sql')
  const teamDowngradeMigration = migration('20260708_team_cleanup_on_downgrade.sql')
  const returnedOrderWorkflowMigration = migration('20260709_fix_returned_order_workflow.sql')
  const orderOtpMigration = migration('20260710_add_order_otp.sql')
  const customerEmailMigration = migration('20260711_add_customer_email.sql')
  const publicOrderOtpMigration = migration('20260712_create_public_order_with_otp.sql')
  const anonymizeCustomerEmailMigration = migration('20260713_anonymize_customer_email.sql')
  const cancelledStatusRepairMigration = migration('20260714_repair_cancelled_order_status.sql')
  const customerAddressHistoryMigration = migration('20260715_add_customer_address_history.sql')
  const structuredAddressMigration = migration('20260716_add_structured_addresses.sql')
  const jwtHookNullFix = migration('20260720_fix_jwt_hook_null_claims.sql')
  const subscriptionStatusMigration = migration('20260721_add_subscription_status.sql')
  const activatePaidSubscriptionMigration = migration('20260722_activate_paid_subscription.sql')
  const renewPaidSubscriptionMigration = migration('20260723_renew_paid_subscription.sql')
  const orderItemsMigration = migration('20260717_add_order_items.sql')
  const orderItemsStockAdjustmentMigration = migration('20260718_fix_order_items_stock_adjustment.sql')
  const getProductStatsMigration = migration('20260724_get_product_stats.sql')
  const orderItemsRlsFixMigration = migration('20260725_fix_order_items_rls.sql')

  it('base tables migration creates the 5 core tables idempotently before any other migration', () => {
    expect(baseTables).toMatch(/CREATE TABLE IF NOT EXISTS sellers/i)
    expect(baseTables).toMatch(/CREATE TABLE IF NOT EXISTS products/i)
    expect(baseTables).toMatch(/CREATE TABLE IF NOT EXISTS customers/i)
    expect(baseTables).toMatch(/CREATE TABLE IF NOT EXISTS orders/i)
    expect(baseTables).toMatch(/CREATE TABLE IF NOT EXISTS deliveries/i)
    expect(baseTables).toMatch(/DROP POLICY IF EXISTS/i)
    expect(baseTables).toMatch(/DROP TRIGGER IF EXISTS orders_updated_at/i)
  })

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

  it('adds an authorized, unbounded SQL aggregate for dashboard KPIs', () => {
    expect(dashboardKpisMigration).toMatch(/CREATE OR REPLACE FUNCTION get_dashboard_kpis/i)
    expect(dashboardKpisMigration).toMatch(/SECURITY DEFINER/i)
    expect(dashboardKpisMigration).toMatch(/get_team_role\(p_seller_id\)/i)
    expect(dashboardKpisMigration).toMatch(/deleted_at IS NULL/i)
    expect(dashboardKpisMigration).not.toMatch(/\n\s*LIMIT\s+\d+/i)
    expect(dashboardKpisMigration).toMatch(/GRANT EXECUTE[\s\S]+authenticated, service_role/i)
  })

  it('indexes activity logs for entity and user lookups', () => {
    expect(activityLogIndexesMigration).toMatch(
      /ON activity_logs\(seller_id, entity_type, entity_id\)/i,
    )
    expect(activityLogIndexesMigration).toMatch(
      /ON activity_logs\(seller_id, user_id, created_at DESC\)/i,
    )
  })

  it('rejects incoherent carrier data before enforcing the strict constraint', () => {
    expect(carrierConstraintMigration).toMatch(/RAISE EXCEPTION/i)
    expect(carrierConstraintMigration).toMatch(/delivery_type = 'carrier'[\s\S]+carrier IS NOT NULL/i)
    expect(carrierConstraintMigration).toMatch(
      /delivery_type = 'self'[\s\S]+tracking_number IS NULL[\s\S]+fee IS NULL/i,
    )
  })

  it('paginates customers with stable indexed cursors and portable JSON tags', () => {
    expect(customerCursorMigration).toMatch(/DROP FUNCTION IF EXISTS get_customers_cursor_page/i)
    expect(customerCursorMigration).toMatch(/CREATE OR REPLACE FUNCTION get_customers_cursor_page/i)
    expect(customerCursorMigration).toMatch(/tags\s+JSONB/i)
    expect(customerCursorMigration).toMatch(/to_jsonb\(c\.tags\)/i)
    expect(customerCursorMigration).toMatch(/get_team_role\(p_seller_id\)/i)
    expect(customerCursorMigration).toMatch(/idx_customers_cursor_order_count/i)
    expect(customerCursorMigration).toMatch(/ORDER BY c\.name ASC, c\.id ASC/i)
    expect(customerCursorMigration).toMatch(/REVOKE ALL ON FUNCTION get_customers_cursor_page/i)
  })

  it('suspends team access on downgrade and restores it on upgrade', () => {
    expect(teamDowngradeMigration).toMatch(/status IN \('pending', 'active', 'suspended'\)/i)
    expect(teamDowngradeMigration).toMatch(/status = 'suspended'/i)
    expect(teamDowngradeMigration).toMatch(/restore_team_after_upgrade/i)
    expect(teamDowngradeMigration).toMatch(/OLD\.plan = 'starter'/i)
    expect(teamDowngradeMigration).not.toMatch(/DELETE FROM team_members/i)
  })

  it('finalizes returned orders through the stock-aware cancellation RPC', () => {
    expect(returnedOrderWorkflowMigration).toMatch(/\('returned', 'cancelled'\)/i)
    expect(returnedOrderWorkflowMigration).toMatch(/USE_CANCEL_ORDER_RPC/i)
    expect(returnedOrderWorkflowMigration).toMatch(
      /v_order\.status NOT IN \('pending', 'new', 'confirmed', 'returned'\)/i,
    )
    expect(returnedOrderWorkflowMigration).toMatch(/PERFORM adjust_order_stock/i)
    expect(returnedOrderWorkflowMigration).toMatch(/Commande retournée puis annulée/i)
  })

  it('stores order OTPs privately as bounded hashes', () => {
    expect(orderOtpMigration).toMatch(/CREATE TABLE IF NOT EXISTS order_otps/i)
    expect(orderOtpMigration).toMatch(/seller_id\s+UUID\s+NOT NULL REFERENCES sellers\(id\) ON DELETE CASCADE/i)
    expect(orderOtpMigration).toMatch(/code_hash\s+TEXT\s+NOT NULL/i)
    expect(orderOtpMigration).toMatch(/attempts\s+INTEGER\s+NOT NULL DEFAULT 0/i)
    expect(orderOtpMigration).toMatch(/CHECK \(attempts BETWEEN 0 AND 5\)/i)
    expect(orderOtpMigration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_order_otps_seller_email_unique/i)
    expect(orderOtpMigration).toMatch(/ALTER TABLE order_otps ENABLE ROW LEVEL SECURITY/i)
    expect(orderOtpMigration).toMatch(/REVOKE ALL ON TABLE order_otps FROM PUBLIC, anon, authenticated/i)
    expect(orderOtpMigration).toMatch(/GRANT ALL ON TABLE order_otps TO service_role/i)
  })

  it('adds customer email to the final order creation RPC signature', () => {
    expect(customerEmailMigration).toMatch(/ADD COLUMN IF NOT EXISTS email TEXT/i)
    expect(customerEmailMigration).toMatch(/ADD COLUMN IF NOT EXISTS customer_email TEXT/i)
    expect(customerEmailMigration).toMatch(/p_customer_email\s+TEXT\s+DEFAULT NULL/i)
    expect(customerEmailMigration).toMatch(/COALESCE\(v_customer_email, email\)/i)
    expect(customerEmailMigration).toMatch(/customer_email/i)
    expect(customerEmailMigration).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })

  it('consumes OTP and creates the public order in one guarded transaction', () => {
    expect(publicOrderOtpMigration).toMatch(/CREATE OR REPLACE FUNCTION create_public_order_with_otp/i)
    expect(publicOrderOtpMigration).toMatch(/SECURITY DEFINER/i)
    expect(publicOrderOtpMigration).toMatch(/IF NOT is_service_role\(\)/i)
    expect(publicOrderOtpMigration).toMatch(/FOR UPDATE/i)
    expect(publicOrderOtpMigration).toMatch(/attempts = LEAST\(attempts \+ 1, 5\)/i)
    expect(publicOrderOtpMigration).toMatch(/v_order_id := create_order_with_stock/i)
    expect(publicOrderOtpMigration).toMatch(/SET verified = true/i)
    expect(publicOrderOtpMigration).toMatch(/TO service_role/i)
    expect(publicOrderOtpMigration).not.toMatch(/TO authenticated, service_role/i)
  })

  it('removes customer email during anonymization', () => {
    expect(anonymizeCustomerEmailMigration).toMatch(/CREATE OR REPLACE FUNCTION anonymize_customer/i)
    expect(anonymizeCustomerEmailMigration).toMatch(/email\s+=\s+NULL/i)
    expect(anonymizeCustomerEmailMigration).toMatch(/UPDATE orders[\s\S]+customer_email = NULL/i)
    expect(anonymizeCustomerEmailMigration).toMatch(/entity_id::TEXT\s*=\s*p_customer_id::TEXT/i)
    expect(anonymizeCustomerEmailMigration).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })

  it('repairs legacy order status constraints that reject cancelled orders', () => {
    expect(cancelledStatusRepairMigration).toMatch(/DROP CONSTRAINT IF EXISTS orders_status_check/i)
    expect(cancelledStatusRepairMigration).toMatch(/ADD CONSTRAINT orders_status_check/i)
    expect(cancelledStatusRepairMigration).toMatch(/'cancelled'/i)
    expect(cancelledStatusRepairMigration).toMatch(/INSERT INTO order_status_transitions/i)
    expect(cancelledStatusRepairMigration).toMatch(/\('pending', 'cancelled'\)/i)
    expect(cancelledStatusRepairMigration).toMatch(/\('new', 'cancelled'\)/i)
    expect(cancelledStatusRepairMigration).toMatch(/\('confirmed', 'cancelled'\)/i)
    expect(cancelledStatusRepairMigration).toMatch(/\('returned', 'cancelled'\)/i)
    expect(cancelledStatusRepairMigration).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })

  it('keeps a full address history for repeat customers', () => {
    expect(customerAddressHistoryMigration).toMatch(/CREATE TABLE IF NOT EXISTS customer_addresses/i)
    expect(customerAddressHistoryMigration).toMatch(/UNIQUE \(customer_id, address_normalized, city_normalized\)/i)
    expect(customerAddressHistoryMigration).toMatch(/ADD COLUMN IF NOT EXISTS customer_address TEXT/i)
    expect(customerAddressHistoryMigration).toMatch(/ADD COLUMN IF NOT EXISTS customer_city TEXT/i)
    expect(customerAddressHistoryMigration).toMatch(/address = COALESCE\(address, v_customer_address\)/i)
    expect(customerAddressHistoryMigration).toMatch(/INSERT INTO customer_addresses/i)
    expect(customerAddressHistoryMigration).toMatch(/ON CONFLICT \(customer_id, address_normalized, city_normalized\)/i)
    expect(customerAddressHistoryMigration).toMatch(/use_count\s+=\s+customer_addresses\.use_count \+ 1/i)
    expect(customerAddressHistoryMigration).toMatch(/customer_address, customer_city/i)
    expect(customerAddressHistoryMigration).toMatch(/DELETE FROM customer_addresses/i)
  })

  it('adds structured carrier-ready customer addresses without dropping legacy data', () => {
    expect(structuredAddressMigration).toMatch(/ADD COLUMN IF NOT EXISTS customer_governorate TEXT/i)
    expect(structuredAddressMigration).toMatch(/ADD COLUMN IF NOT EXISTS customer_landmark TEXT/i)
    expect(structuredAddressMigration).toMatch(/ADD COLUMN IF NOT EXISTS delivery_notes TEXT/i)
    expect(structuredAddressMigration).toMatch(/customer_address\s+=\s+COALESCE/i)
    expect(structuredAddressMigration).toMatch(/customer_addresses_structured_address_required/i)
    expect(structuredAddressMigration).toMatch(/idx_orders_structured_location_created/i)
    expect(structuredAddressMigration).toMatch(/p_customer_governorate\s+TEXT\s+DEFAULT NULL/i)
    expect(structuredAddressMigration).toMatch(/p_delivery_notes\s+TEXT\s+DEFAULT NULL/i)
    expect(structuredAddressMigration).toMatch(/CREATE OR REPLACE FUNCTION search_orders/i)
    expect(structuredAddressMigration).toMatch(/NOTIFY pgrst, 'reload schema'/i)
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

  it('does not let pending invitees update their own team role through RLS', () => {
    const policy = teamMembers.match(
      /CREATE POLICY "team_update" ON team_members FOR UPDATE[\s\S]+?;\n/i,
    )?.[0] ?? ''

    expect(policy).toContain('CREATE POLICY "team_update"')
    expect(policy).toMatch(/seller_id = auth\.uid\(\)/i)
    expect(policy).toMatch(/get_team_role\(seller_id\) = 'admin'/i)
    expect(policy).not.toMatch(/lower\(email\)/i)
    expect(policy).not.toMatch(/status\s*=\s*'pending'/i)
    expect(policy).not.toMatch(/user_id\s*=\s*auth\.uid\(\)/i)
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

  it('removes the legacy double-count trigger only after verifying its replacement', () => {
    expect(doubleOrderCountFix).toMatch(/BEGIN;/i)
    expect(doubleOrderCountFix).toMatch(
      /tgname = 'trg_update_customer_order_count'/i
    )
    expect(doubleOrderCountFix).toMatch(
      /DROP TRIGGER IF EXISTS orders_increment_customer_count ON orders;/i
    )
    expect(doubleOrderCountFix).toMatch(
      /DROP FUNCTION IF EXISTS increment_customer_order_count\(\);/i
    )
    expect(doubleOrderCountFix).toMatch(/o\.customer_id = c\.id/i)
    expect(doubleOrderCountFix).toMatch(/o\.seller_id = c\.seller_id/i)
    expect(doubleOrderCountFix).toMatch(/o\.deleted_at IS NULL/i)
    expect(doubleOrderCountFix).toMatch(/COMMIT;/i)
  })

  it('aggregates analytics exports with guarded seller access and bounded dates', () => {
    expect(analyticsExportRpc).toMatch(/CREATE OR REPLACE FUNCTION get_analytics_export/i)
    expect(analyticsExportRpc).toMatch(/SECURITY DEFINER/i)
    expect(analyticsExportRpc).toMatch(
      /get_team_role\(p_seller_id\) IN \('admin', 'operator', 'readonly'\)/i
    )
    expect(analyticsExportRpc).toMatch(/RAISE EXCEPTION 'INVALID_DATE_RANGE'/i)
    expect(analyticsExportRpc).toMatch(/INTERVAL '366 days'/i)
    expect(analyticsExportRpc).toMatch(/GROUP BY o\.created_at::DATE/i)
    expect(analyticsExportRpc).toMatch(
      /REVOKE ALL ON FUNCTION get_analytics_export\(UUID, TIMESTAMPTZ, TIMESTAMPTZ\) FROM PUBLIC/i
    )
  })

  it('restores PostgREST table privileges without replacing RLS authorization', () => {
    expect(apiRolePrivileges).toMatch(
      /GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role/i
    )
    expect(apiRolePrivileges).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE\s+ON ALL TABLES IN SCHEMA public\s+TO authenticated/i
    )
    expect(apiRolePrivileges).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public/i
    )
    expect(apiRolePrivileges).not.toMatch(/DISABLE ROW LEVEL SECURITY/i)
    expect(apiRolePrivileges).not.toMatch(/BYPASSRLS/i)
  })

  it('detects service_role across current and legacy PostgREST claim formats', () => {
    expect(serviceRoleDetection).toMatch(
      /CREATE OR REPLACE FUNCTION is_service_role\(\)/i
    )
    expect(serviceRoleDetection).toMatch(/auth\.role\(\)/i)
    expect(serviceRoleDetection).toMatch(/request\.jwt\.claim\.role/i)
    expect(serviceRoleDetection).toMatch(/request\.jwt\.claims/i)
    expect(serviceRoleDetection).toMatch(
      /WHEN is_service_role\(\) THEN 'admin'/i
    )
    expect(serviceRoleDetection).toMatch(
      /is_service_role\(\)\s+OR get_team_role\(p_seller_id\) IN \('admin', 'operator'\)/i
    )
    expect(serviceRoleDetection).not.toMatch(/ALTER ROLE .*BYPASSRLS/i)
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

  it('rejects zero-delta calls in adjust_product_stock to prevent no-op stock movements', () => {
    expect(adjustStockDeltaFix).toMatch(/CREATE OR REPLACE FUNCTION adjust_product_stock/i)
    expect(adjustStockDeltaFix).toMatch(/SECURITY DEFINER/i)
    expect(adjustStockDeltaFix).toMatch(/p_delta = 0/i)
    expect(adjustStockDeltaFix).toMatch(/RAISE EXCEPTION 'INVALID_DELTA/i)
    expect(adjustStockDeltaFix).toMatch(/IF NOT is_service_role\(\)/i)
    expect(adjustStockDeltaFix).toMatch(/can_write_seller\(p_seller_id\)/i)
    expect(adjustStockDeltaFix).toMatch(/INSERT INTO stock_movements/i)
  })

  it('anonymizes customer PII while preserving order history (INPDP loi 2004-63)', () => {
    expect(anonymizeCustomerMigration).toMatch(/CREATE OR REPLACE FUNCTION anonymize_customer/i)
    expect(anonymizeCustomerMigration).toMatch(/SECURITY DEFINER/i)
    expect(anonymizeCustomerMigration).toMatch(/is_service_role\(\)/i)
    expect(anonymizeCustomerMigration).toMatch(/get_team_role\(p_seller_id\) = 'admin'/i)
    expect(anonymizeCustomerMigration).toMatch(/name\s+=\s+'Client anonymisé'/i)
    expect(anonymizeCustomerMigration).toMatch(/phone\s+=\s+'00000000'/i)
    expect(anonymizeCustomerMigration).toMatch(/tags\s+=\s+ARRAY\[\]::TEXT\[\]/i)
    expect(anonymizeCustomerMigration).toMatch(/UPDATE activity_logs/i)
    expect(anonymizeCustomerMigration).toMatch(/RAISE EXCEPTION 'CUSTOMER_NOT_FOUND'/i)
    expect(anonymizeCustomerMigration).toMatch(/REVOKE ALL ON FUNCTION anonymize_customer\(UUID, UUID\) FROM PUBLIC/i)
  })

  it('supports both JSONB and TEXT[] customer tags during anonymization', () => {
    expect(anonymizeCustomerTagsTypeFix).toMatch(/CREATE OR REPLACE FUNCTION anonymize_customer/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/atttypid::regtype::TEXT/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/v_tags_type = 'jsonb'/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/tags = ''\[\]''::jsonb/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/v_tags_type = 'text\[\]'/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/tags = ARRAY\[\]::text\[\]/i)
    expect(anonymizeCustomerTagsTypeFix).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })

  it('supports both UUID and TEXT activity entity IDs during anonymization', () => {
    expect(anonymizeCustomerEntityTypeFix).toMatch(/CREATE OR REPLACE FUNCTION anonymize_customer/i)
    expect(anonymizeCustomerEntityTypeFix).toMatch(
      /entity_id::TEXT\s*=\s*p_customer_id::TEXT/i,
    )
    expect(anonymizeCustomerEntityTypeFix).toMatch(/UPDATE activity_logs/i)
    expect(anonymizeCustomerEntityTypeFix).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })

  it('aggregates COD totals for admins without dropping archived receivables', () => {
    expect(codSummaryMigration).toMatch(/CREATE OR REPLACE FUNCTION get_cod_summary/i)
    expect(codSummaryMigration).toMatch(/SECURITY DEFINER/i)
    expect(codSummaryMigration).toMatch(/IF NOT is_service_role\(\)/i)
    expect(codSummaryMigration).toMatch(/get_team_role\(p_seller_id\) = 'admin'/i)
    expect(codSummaryMigration).toMatch(/SUM\(d\.cod_reversed_amount\)/i)
    expect(codSummaryMigration).not.toMatch(/o\.deleted_at IS NULL/i)
    expect(codSummaryMigration).toMatch(/REVOKE ALL ON FUNCTION get_cod_summary\(UUID\) FROM PUBLIC/i)
  })

  it('adds personal deliveries without creating false carrier reversals', () => {
    expect(deliveryTypeMigration).toMatch(/ADD COLUMN IF NOT EXISTS delivery_type/i)
    expect(deliveryTypeMigration).toMatch(/deliveries_delivery_type_check/i)
    expect(deliveryTypeMigration).toMatch(/delivery_type = 'self'[\s\S]+carrier IS NULL/i)
    expect(deliveryTypeMigration).toMatch(/CREATE FUNCTION create_delivery_from_order/i)
    expect(deliveryTypeMigration).toMatch(/IF NOT is_service_role\(\)/i)
    expect(deliveryTypeMigration).toMatch(/FOR UPDATE/i)
    expect(deliveryTypeMigration).toMatch(/CREATE OR REPLACE FUNCTION mark_self_delivery_complete/i)
    expect(deliveryTypeMigration).toMatch(/d\.delivery_type = 'self'/i)
    expect(deliveryTypeMigration).toMatch(
      /d\.delivery_type = 'carrier' AND d\.cod_collected AND NOT d\.cod_reversed/i,
    )
    expect(deliveryTypeMigration).toMatch(
      /REVOKE ALL ON FUNCTION mark_self_delivery_complete\(UUID, UUID, UUID\) FROM PUBLIC/i,
    )
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

  it('secures order creation against cross-seller access, quota bypass, and forged actors', () => {
    expect(secureOrderRpc).toMatch(/can_write_seller\(p_seller_id\)/i)
    expect(secureOrderRpc).toMatch(/p_status NOT IN \('pending', 'new'\)/i)
    expect(secureOrderRpc).toMatch(/FROM sellers[\s\S]+WHERE id = p_seller_id[\s\S]+FOR UPDATE/i)
    expect(secureOrderRpc).toMatch(/v_subscription_end IS NOT NULL AND v_subscription_end < now\(\)/i)
    expect(secureOrderRpc).toMatch(/RAISE EXCEPTION 'SHOP_INACTIVE'/i)
    expect(secureOrderRpc).toMatch(/v_monthly_orders >= 100/i)
    expect(secureOrderRpc).toMatch(/RAISE EXCEPTION 'LIMIT_REACHED'/i)
    expect(secureOrderRpc).toMatch(/ELSE auth\.uid\(\)/i)
    expect(secureOrderRpc).toMatch(/VALUES \(v_order_id, p_status, v_actor\)/i)
  })

  it('secures delivery RPCs and keeps the stock helper internal', () => {
    expect(secureDeliveryRpcs).toMatch(/CREATE OR REPLACE FUNCTION create_delivery_from_order/i)
    expect(secureDeliveryRpcs).toMatch(/CREATE OR REPLACE FUNCTION mark_delivery_cod_collected/i)
    expect(secureDeliveryRpcs).toMatch(/CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock/i)
    expect(secureDeliveryRpcs).toMatch(/CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock/i)
    expect(secureDeliveryRpcs.match(/can_write_seller\(p_seller_id\)/gi)?.length).toBeGreaterThanOrEqual(3)
    expect(secureDeliveryRpcs).toMatch(/v_old_status NOT IN \('shipped', 'delivered'\)/i)
    expect(secureDeliveryRpcs).toMatch(/ELSE auth\.uid\(\)/i)
    expect(secureDeliveryRpcs).toMatch(
      /REVOKE EXECUTE ON FUNCTION adjust_order_stock\(UUID, UUID, INTEGER, TEXT, TEXT, UUID\) FROM authenticated/i
    )
  })

  it('enforces the order state machine while preserving delivery rollback', () => {
    expect(statusTransitions).toMatch(/CREATE TABLE IF NOT EXISTS order_status_transitions/i)
    expect(statusTransitions).toMatch(/\('pending',\s+'new'\)/i)
    expect(statusTransitions).toMatch(/\('new',\s+'confirmed'\)/i)
    expect(statusTransitions).toMatch(/\('confirmed',\s+'shipped'\)/i)
    expect(statusTransitions).toMatch(/\('shipped',\s+'delivered'\)/i)
    expect(statusTransitions).toMatch(/\('shipped',\s+'returned'\)/i)
    expect(statusTransitions).toMatch(/\('shipped',\s+'confirmed'\)/i)
    expect(statusTransitions).toMatch(/RAISE EXCEPTION 'INVALID_TRANSITION:%->%'/i)
  })

  it('records COD reversals once through a guarded RPC', () => {
    expect(codReversalHistory).toMatch(/CREATE TABLE IF NOT EXISTS cod_reversals/i)
    expect(codReversalHistory).toMatch(/ALTER TABLE cod_reversals ENABLE ROW LEVEL SECURITY/i)
    expect(codReversalHistory).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_cod_reversals_delivery_unique/i)
    expect(codReversalHistory).not.toMatch(/CREATE POLICY "cod_reversals_insert"/i)
    expect(codReversalHistory).toMatch(/CREATE OR REPLACE FUNCTION mark_delivery_cod_reversed/i)
    expect(codReversalHistory).toMatch(/get_team_role\(p_seller_id\) = 'admin'/i)
    expect(codReversalHistory).not.toMatch(/can_write_seller\(p_seller_id\)/i)
    expect(codReversalHistory).toMatch(/FOR UPDATE OF d, o/i)
    expect(codReversalHistory).toMatch(/RAISE EXCEPTION 'COD_ALREADY_REVERSED'/i)
    expect(codReversalHistory).toMatch(/RAISE EXCEPTION 'INVALID_REVERSAL_AMOUNT'/i)
    expect(codReversalHistory).toMatch(/REVOKE ALL ON FUNCTION mark_delivery_cod_reversed/i)
  })

  it('JWT hook never returns NULL — guards against missing claims key and internal errors', () => {
    // Cause du bug original : jsonb_set(event, '{claims,seller_id}', ...) retourne NULL
    // si event->'claims' est absent, car jsonb_set ne crée que le dernier niveau manquant.
    // Ce test vérifie que le correctif est présent dans la migration.

    // 1. Guard event IS NULL
    expect(jwtHookNullFix).toMatch(/IF event IS NULL/i)
    expect(jwtHookNullFix).toMatch(/RETURN '\{\}'::JSONB/i)

    // 2. Extraction sûre des claims existants avant toute manipulation
    expect(jwtHookNullFix).toMatch(/COALESCE\(event\s*->\s*'claims',\s*'\{\}'::JSONB\)/i)

    // 3. Enrichissement via || (pas de jsonb_set multi-niveaux)
    expect(jwtHookNullFix).toMatch(/jsonb_build_object\(/i)
    expect(jwtHookNullFix).toMatch(/'seller_id'/i)
    expect(jwtHookNullFix).toMatch(/'plan'/i)
    expect(jwtHookNullFix).toMatch(/'subscription_end'/i)

    // 4. jsonb_set à un seul niveau '{claims}' — jamais NULL si event est un objet valide
    expect(jwtHookNullFix).toMatch(/jsonb_set\(event,\s*'\{claims\}'/i)

    // 5. Filet de sécurité : toute exception retourne l'event d'origine
    expect(jwtHookNullFix).toMatch(/EXCEPTION WHEN OTHERS THEN/i)
    expect(jwtHookNullFix).toMatch(/RETURN COALESCE\(event,\s*'\{\}'::JSONB\)/i)

    // Permissions : hook accessible uniquement à supabase_auth_admin
    expect(jwtHookNullFix).toMatch(/REVOKE ALL ON FUNCTION set_seller_jwt_claims/i)
    expect(jwtHookNullFix).toMatch(/GRANT EXECUTE[\s\S]+TO supabase_auth_admin/i)
    expect(jwtHookNullFix).not.toMatch(/TO authenticated/i)
  })

  it('adds subscription_status with binary constraint and trial default — no expired state', () => {
    expect(subscriptionStatusMigration).toMatch(/ADD COLUMN IF NOT EXISTS subscription_status/i)
    expect(subscriptionStatusMigration).toMatch(/CHECK.*subscription_status.*IN.*'trial'.*'active'/i)
    expect(subscriptionStatusMigration).toMatch(/DEFAULT 'trial'/i)
    expect(subscriptionStatusMigration).toMatch(/NOT NULL/i)
    // 'expired' ne doit pas être une valeur valide dans la contrainte CHECK
    expect(subscriptionStatusMigration).not.toMatch(/CHECK.*expired/i)
  })

  it('activate_paid_subscription is service_role only, locks the seller row, and links upgrade_requests optionally', () => {
    expect(activatePaidSubscriptionMigration).toMatch(/CREATE OR REPLACE FUNCTION activate_paid_subscription/i)
    expect(activatePaidSubscriptionMigration).toMatch(/SECURITY DEFINER/i)
    expect(activatePaidSubscriptionMigration).toMatch(/is_service_role/i)
    // p_activated_by TEXT : supporte UUID et identifiant système
    expect(activatePaidSubscriptionMigration).toMatch(/p_activated_by\s+TEXT/i)
    // Verrouillage ligne pour atomicité
    expect(activatePaidSubscriptionMigration).toMatch(/FOR UPDATE/i)
    // Mise à jour de subscription_status
    expect(activatePaidSubscriptionMigration).toMatch(/subscription_status\s*=\s*'active'/i)
    // Journal d'activité intégré
    expect(activatePaidSubscriptionMigration).toMatch(/subscription_activated/i)
    expect(activatePaidSubscriptionMigration).toMatch(/INSERT INTO activity_logs/i)
    // upgrade_requests : effet de bord optionnel, pas une dépendance dure
    expect(activatePaidSubscriptionMigration).toMatch(/upgrade_requests/i)
    // Accessible seulement à service_role
    expect(activatePaidSubscriptionMigration).toMatch(/GRANT EXECUTE[\s\S]+service_role/i)
    expect(activatePaidSubscriptionMigration).not.toMatch(/GRANT EXECUTE[\s\S]+authenticated/i)
  })

  it('renew_paid_subscription preserves remaining time and stays pure of upgrade_requests', () => {
    expect(renewPaidSubscriptionMigration).toMatch(/CREATE OR REPLACE FUNCTION renew_paid_subscription/i)
    expect(renewPaidSubscriptionMigration).toMatch(/SECURITY DEFINER/i)
    expect(renewPaidSubscriptionMigration).toMatch(/is_service_role/i)
    // Extension depuis GREATEST(now(), subscription_end) pour préserver le temps restant
    expect(renewPaidSubscriptionMigration).toMatch(/GREATEST\(now\(\)/i)
    expect(renewPaidSubscriptionMigration).toMatch(/subscription_status\s*=\s*'active'/i)
    expect(renewPaidSubscriptionMigration).toMatch(/p_activated_by\s+TEXT/i)
    expect(renewPaidSubscriptionMigration).toMatch(/subscription_renewed/i)
    expect(renewPaidSubscriptionMigration).toMatch(/INSERT INTO activity_logs/i)
    // Pas de dépendance sur upgrade_requests (renouvellement = pas de demande pendante)
    expect(renewPaidSubscriptionMigration).not.toMatch(/upgrade_requests/i)
    expect(renewPaidSubscriptionMigration).toMatch(/GRANT EXECUTE[\s\S]+service_role/i)
    expect(renewPaidSubscriptionMigration).not.toMatch(/GRANT EXECUTE[\s\S]+authenticated/i)
  })

  // P1 — vérification que anonymize_customer (version 20260716) efface bien tous
  // les champs d'adresse structurée sur orders ET customers.
  // La migration 20260713 ne couvrait que customer_email — 20260716 a complété le champ.
  it('anonymize_customer (20260716) clears all structured address columns from orders and customers', () => {
    // orders — colonnes ajoutées par 20260716
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+customer_governorate\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+customer_delegation\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+customer_landmark\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+customer_postal_code\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+delivery_notes\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE orders[\s\S]+address_version\s*=\s*1/i
    )
    // customers — colonnes structured address
    expect(structuredAddressMigration).toMatch(
      /UPDATE customers[\s\S]+customer_governorate\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE customers[\s\S]+customer_landmark\s*=\s*NULL/i
    )
    expect(structuredAddressMigration).toMatch(
      /UPDATE customers[\s\S]+delivery_notes\s*=\s*NULL/i
    )
  })

  // P2 — get_product_stats lit depuis order_items (pas depuis orders.product_id)
  it('get_product_stats reads from order_items for accurate multi-item order stats', () => {
    expect(getProductStatsMigration).toMatch(/CREATE OR REPLACE FUNCTION get_product_stats/i)
    expect(getProductStatsMigration).toMatch(/SECURITY DEFINER/i)
    expect(getProductStatsMigration).toMatch(/STABLE/i)
    expect(getProductStatsMigration).toMatch(/get_team_role\(p_seller_id\)/i)
    expect(getProductStatsMigration).toMatch(/FROM order_items/i)
    expect(getProductStatsMigration).toMatch(/total_orders/i)
    expect(getProductStatsMigration).toMatch(/total_revenue/i)
    expect(getProductStatsMigration).toMatch(/has_blocking_orders/i)
    expect(getProductStatsMigration).toMatch(/recent_orders/i)
    // index composite pour la perf
    expect(getProductStatsMigration).toMatch(/idx_order_items_product_seller/i)
    expect(getProductStatsMigration).toMatch(/GRANT EXECUTE[\s\S]+authenticated, service_role/i)
  })

  // P2 — order_items : table créée avec RLS activée et backfill legacy
  it('order_items table is created with RLS and legacy orders are backfilled', () => {
    expect(orderItemsMigration).toMatch(/CREATE TABLE IF NOT EXISTS order_items/i)
    expect(orderItemsMigration).toMatch(/order_id\s+UUID\s+NOT NULL REFERENCES orders\(id\) ON DELETE CASCADE/i)
    expect(orderItemsMigration).toMatch(/ALTER TABLE order_items ENABLE ROW LEVEL SECURITY/i)
    expect(orderItemsMigration).toMatch(/INSERT INTO order_items[\s\S]+SELECT[\s\S]+FROM orders o/i)
    expect(orderItemsMigration).toMatch(/WHERE o\.product_id IS NOT NULL/i)
    expect(orderItemsMigration).toMatch(/CREATE OR REPLACE FUNCTION create_order_with_items/i)
  })

  it('public multi-item OTP orders strip client prices before creating the order', () => {
    const publicOtpFunction = orderItemsMigration.match(
      /CREATE OR REPLACE FUNCTION create_public_order_with_otp[\s\S]+?NOTIFY pgrst, 'reload schema';/i,
    )?.[0] ?? ''

    expect(publicOtpFunction).toMatch(/CREATE OR REPLACE FUNCTION create_public_order_with_otp/i)
    expect(publicOtpFunction).toMatch(/jsonb_strip_nulls\(jsonb_build_object/i)
    expect(publicOtpFunction).toMatch(/'product_id', item->>'product_id'/i)
    expect(publicOtpFunction).toMatch(/'quantity', item->>'quantity'/i)
    expect(publicOtpFunction).not.toMatch(/'unit_price'/i)
  })

  it('create_order_with_items rejects duplicate product-variant lines before stock decrement', () => {
    const createOrderWithItems = orderItemsMigration.match(
      /CREATE OR REPLACE FUNCTION create_order_with_items[\s\S]+?REVOKE ALL ON FUNCTION create_order_with_items/i,
    )?.[0] ?? ''

    expect(createOrderWithItems).toMatch(/v_items\s+JSONB/i)
    expect(createOrderWithItems).toMatch(/jsonb_typeof\(p_items\) = 'string'/i)
    expect(createOrderWithItems).toMatch(/\(p_items #>> '\{\}'\)::JSONB/i)
    expect(createOrderWithItems).toMatch(/HAVING COUNT\(\*\) > 1/i)
    expect(createOrderWithItems).toMatch(/RAISE EXCEPTION 'DUPLICATE_ORDER_ITEM'/i)
  })

  // P2 — adjust_order_items_stock itère sur order_items pour restaurer tous les articles
  it('adjust_order_items_stock restores stock for all items of a multi-item order', () => {
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /CREATE OR REPLACE FUNCTION adjust_order_items_stock/i
    )
    expect(orderItemsStockAdjustmentMigration).toMatch(/FOR v_item IN[\s\S]+FROM order_items/i)
    expect(orderItemsStockAdjustmentMigration).toMatch(/p_delta_sign NOT IN \(1, -1\)/i)
    expect(orderItemsStockAdjustmentMigration).toMatch(/PERFORM adjust_order_items_stock/i)
    // Les quatre RPCs l'utilisent
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /CREATE OR REPLACE FUNCTION cancel_pending_order_with_stock/i
    )
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /CREATE OR REPLACE FUNCTION cancel_order_with_stock/i
    )
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /CREATE OR REPLACE FUNCTION soft_delete_order_with_stock/i
    )
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /CREATE OR REPLACE FUNCTION restore_trashed_order_with_stock/i
    )
    // Le helper interne est accessible uniquement à service_role (pas à authenticated)
    expect(orderItemsStockAdjustmentMigration).toMatch(
      /GRANT EXECUTE ON FUNCTION adjust_order_items_stock[^\n]+TO service_role/i
    )
    expect(
      (orderItemsStockAdjustmentMigration.match(
        /GRANT EXECUTE ON FUNCTION adjust_order_items_stock[^\n]+/i
      ) ?? [''])[0]
    ).not.toMatch(/authenticated/i)
  })

  // P3 — RLS order_items team-aware : get_seller_id() au lieu de auth.uid()
  it('order_items RLS policy uses get_seller_id() so team members can read order items', () => {
    expect(orderItemsRlsFixMigration).toMatch(/DROP POLICY IF EXISTS[\s\S]+ON order_items/i)
    expect(orderItemsRlsFixMigration).toMatch(/CREATE POLICY[\s\S]+ON order_items FOR SELECT/i)
    expect(orderItemsRlsFixMigration).toMatch(/seller_id\s*=\s*get_seller_id\(\)/i)
    // auth.uid() direct n'est plus utilisé dans la policy
    expect(orderItemsRlsFixMigration).not.toMatch(/auth\.uid\(\)/i)
    expect(orderItemsRlsFixMigration).toMatch(/NOTIFY pgrst, 'reload schema'/i)
  })
})
