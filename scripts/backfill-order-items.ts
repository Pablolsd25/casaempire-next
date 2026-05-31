/**
 * scripts/backfill-order-items.ts
 *
 * Backfills order_items.name and order_items.product_image
 * by re-fetching all Wix orders and matching their lineItems to
 * the existing order_items rows by (order_id, position).
 *
 * Also links order_items.product_id to the correct Supabase product
 * via products.wix_id (requires 20260530_add_wix_id_column.sql migration).
 *
 * PREREQUISITE: Apply these SQL migrations in Supabase Dashboard first:
 *   supabase/migrations/20260530_add_wix_id_column.sql
 *   supabase/migrations/20260530_order_items_name_image.sql
 *
 * Usage:
 *   npm run backfill:items
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const WIX_ORDERS_API = 'https://www.wixapis.com/stores/v2/orders/query'
const WIX_PRODUCTS_API = 'https://www.wixapis.com/stores/v1/products/query'
const HEADERS = {
  'Content-Type':   'application/json',
  'Authorization':  process.env.WIX_API_KEY ?? '',
  'wix-account-id': process.env.WIX_ACCOUNT_ID ?? '',
  'wix-site-id':    process.env.WIX_SITE_ID ?? '',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Fetch all Wix products to get their main image ──────────────────────────

async function fetchWixProductImages(): Promise<Map<string, string>> {
  /** Returns: wixProductId → first image URL */
  const map = new Map<string, string>()
  let offset = 0
  while (true) {
    const res = await fetch(WIX_PRODUCTS_API, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ query: { paging: { limit: 100, offset } } }),
    })
    if (!res.ok) break
    const json = await res.json() as { products?: Array<{ id: string; media?: { mainMedia?: { image?: { url?: string } } } }> }
    const products = json.products ?? []
    for (const p of products) {
      const img = p.media?.mainMedia?.image?.url
      if (img) map.set(p.id, img)
    }
    if (products.length < 100) break
    offset += products.length
  }
  return map
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄  Fetching Wix product images...')
  const wixImageMap = await fetchWixProductImages()
  console.log(`   ${wixImageMap.size} product images loaded.`)

  // Load Supabase product wix_id → supabase id mapping
  console.log('🔄  Loading Supabase products wix_id map...')
  const { data: sbProducts } = await supabase.from('products').select('id, wix_id')
  const wixIdToSbProductId = new Map<string, string>()
  for (const p of sbProducts ?? []) {
    if (p.wix_id) wixIdToSbProductId.set(p.wix_id, p.id)
  }
  console.log(`   ${wixIdToSbProductId.size} products with wix_id linked.`)

  // Load all Supabase wix orders: openpay_transaction_id → supabase order id
  console.log('🔄  Loading Supabase orders...')
  const allSbOrders: Array<{ id: string; openpay_transaction_id: string }> = []
  let sbOffset = 0
  while (true) {
    const { data: page } = await supabase
      .from('orders')
      .select('id, openpay_transaction_id')
      .like('openpay_transaction_id', 'wix_%')
      .range(sbOffset, sbOffset + 999)
    if (!page?.length) break
    allSbOrders.push(...page)
    if (page.length < 1000) break
    sbOffset += page.length
  }
  const sbOrderMap = new Map<string, string>() // wix UUID → supabase order id
  for (const o of allSbOrders) {
    sbOrderMap.set(o.openpay_transaction_id.replace('wix_', ''), o.id)
  }
  console.log(`   ${sbOrderMap.size} Supabase wix orders loaded.`)

  // Fetch all Wix orders and update order_items
  console.log('🔄  Fetching Wix orders to backfill line items...')
  let total = Infinity, offset = 0, processed = 0, errors = 0

  while (offset < total) {
    const res = await fetch(WIX_ORDERS_API, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ query: { paging: { limit: 100, offset } } }),
    })
    if (!res.ok) throw new Error(`Wix API error: ${res.status}`)
    const json = await res.json() as {
      orders?: Array<{
        id: string
        number: number
        lineItems: Array<{ name: string; quantity: number; price: string; productId?: string }>
      }>
      totalResults?: number
    }
    if (offset === 0) {
      total = json.totalResults ?? 0
      console.log(`   Wix total: ${total}`)
    }

    const orders = json.orders ?? []
    if (!orders.length) break

    for (const wo of orders) {
      const sbOrderId = sbOrderMap.get(wo.id)
      if (!sbOrderId) continue

      // Fetch this order's items from Supabase (ordered consistently)
      const { data: sbItems } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price')
        .eq('order_id', sbOrderId)
        .order('id')

      if (!sbItems?.length) continue

      // Match by position (both Wix and Supabase insert lineItems in the same order)
      for (let i = 0; i < Math.min(wo.lineItems.length, sbItems.length); i++) {
        const li = wo.lineItems[i]
        const item = sbItems[i]
        const image = li.productId ? (wixImageMap.get(li.productId) ?? null) : null
        const sbProductId = li.productId ? (wixIdToSbProductId.get(li.productId) ?? null) : null

        const { error } = await supabase
          .from('order_items')
          .update({
            name:          li.name,
            product_image: image,
            product_id:    sbProductId,
          })
          .eq('id', item.id)

        if (error) {
          console.error(`  ✗  Order #${wo.number} item ${i}: ${error.message}`)
          errors++
        }
      }

      processed++
    }

    offset += orders.length
    if (offset % 500 === 0) console.log(`   Processed ${offset}/${total}...`)
  }

  console.log(`\n✅  Done.  Orders processed: ${processed}  |  Errors: ${errors}`)
}

main().catch((err) => {
  console.error('❌  backfill-order-items failed:', err)
  process.exit(1)
})
