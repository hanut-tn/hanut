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
})
