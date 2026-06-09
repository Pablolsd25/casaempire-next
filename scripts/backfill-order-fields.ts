/**
 * scripts/backfill-order-fields.ts
 *
 * Backfills wix_order_number and customer_name for all existing Wix orders
 * in Supabase that are missing those fields.
 * Also inserts any Wix orders that are missing from Supabase
 * (e.g. pending/non-paid orders like #12401).
 *
 * Usage:
 *   npm run backfill:orders
 *
 * PREREQUISITE: Run the SQL migration first in Supabase Dashboard:
 *   supabase/migrations/20260530_add_order_display_fields.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar .env.local manualmente (sin dotenv)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const WIX_ORDERS_API = 'https://www.wixapis.com/stores/v2/orders/query'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface WixAddress {
  addressLine1?: string
  city?:        string
  subdivision?: string
  zipCode?:     string
  country?:     string
  phone?:       string
  email?:       string
}

interface WixLineItem {
  index:      number
  quantity:   number
  price:      string
  name:       string
  productId?: string
}

interface WixOrderV2 {
  id:                string
  number:            number
  dateCreated:       string
  paymentStatus:     string
  fulfillmentStatus: string
  totals: { subtotal: string; shipping: string; total: string }
  buyerInfo?: { email?: string; phone?: string; firstName?: string; lastName?: string }
  billingInfo?:  { address?: WixAddress }
  shippingInfo?: { shipmentDetails?: { address?: WixAddress } }
  lineItems: WixLineItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusFromWix(fulfillment: string, payment: string): string {
  if (payment === 'PAID') {
    if (fulfillment === 'FULFILLED')           return 'delivered'
    if (fulfillment === 'PARTIALLY_FULFILLED') return 'shipped'
    return 'paid'
  }
  if (payment === 'CANCELED' || fulfillment === 'CANCELED') return 'cancelled'
  return 'pending'
}

async function fetchAllWixOrders(): Promise<WixOrderV2[]> {
  const all: WixOrderV2[] = []
  let offset = 0
  const limit = 100
  let total   = Infinity

  while (offset < total) {
    const res = await fetch(WIX_ORDERS_API, {
      method:  'POST',
      headers: HEADERS,
      body: JSON.stringify({
        query: { paging: { limit, offset } },  // No paymentStatus filter — get ALL orders
      }),
    })

    if (!res.ok) throw new Error(`Wix orders failed: ${res.status}`)
    const json = await res.json() as { orders?: WixOrderV2[]; totalResults?: number }

    const orders = json.orders ?? []
    if (orders.length === 0) break
    all.push(...orders)

    if (offset === 0) {
      total = json.totalResults ?? 0
      console.log(`   Wix total orders (all statuses): ${total}`)
    }
    offset += orders.length
    if (offset % 500 === 0) console.log(`   Fetched ${offset}/${total}...`)
  }
  return all
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄  Loading existing Supabase wix orders...')
  // Paginate to load ALL wix orders (Supabase default cap is 1000 rows)
  const allSbOrders: Array<{ id: string; openpay_transaction_id: string; wix_order_number: number | null; customer_name: string | null }> = []
  const PAGE = 1000
  let sbOffset = 0
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from('orders')
      .select('id, openpay_transaction_id, wix_order_number, customer_name')
      .like('openpay_transaction_id', 'wix_%')
      .range(sbOffset, sbOffset + PAGE - 1)
    if (pageErr) throw pageErr
    if (!page || page.length === 0) break
    allSbOrders.push(...(page as typeof allSbOrders))
    if (page.length < PAGE) break
    sbOffset += PAGE
  }

  // Map: wix UUID → supabase row
  const sbMap = new Map<string, { id: string; wix_order_number: number | null; customer_name: string | null }>()
  for (const o of allSbOrders) {
    const wixId = o.openpay_transaction_id.replace('wix_', '')
    sbMap.set(wixId, o)
  }

  const { data: productRows } = await supabase.from('products').select('id, wix_id')
  const productMap = new Map<string, string>()
  for (const p of productRows ?? []) if (p.wix_id) productMap.set(p.wix_id, p.id)

  console.log(`   Supabase wix orders: ${sbMap.size}`)

  console.log('🔄  Fetching ALL Wix orders...')
  const wixOrders = await fetchAllWixOrders()
  console.log(`   Fetched ${wixOrders.length} Wix orders.`)

  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (const wo of wixOrders) {
    const customerName = [wo.buyerInfo?.firstName, wo.buyerInfo?.lastName]
      .filter(Boolean).join(' ').trim() || null

    const existing = sbMap.get(wo.id)

    if (!existing) {
      // ── INSERT missing order ──────────────────────────────────────────────
      const addr =
        wo.shippingInfo?.shipmentDetails?.address ??
        wo.billingInfo?.address

      const customerEmail =
        (wo.buyerInfo?.email ?? addr?.email ?? '').trim().toLowerCase() || null

      const shippingAddress = addr ? {
        street:     addr.addressLine1 ?? '',
        city:       addr.city ?? '',
        state:      addr.subdivision ?? '',
        postalCode: addr.zipCode ?? '',
        country:    addr.country ?? 'MX',
        phone:      addr.phone ?? wo.buyerInfo?.phone ?? '',
        email:      customerEmail ?? '',
      } : null

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          profile_id:             null,
          status:                 statusFromWix(wo.fulfillmentStatus, wo.paymentStatus),
          subtotal:               parseFloat(wo.totals.subtotal),
          shipping_cost:          parseFloat(wo.totals.shipping),
          total:                  parseFloat(wo.totals.total),
          openpay_transaction_id: `wix_${wo.id}`,
          shipping_address:       shippingAddress,
          customer_email:         customerEmail,
          customer_name:          customerName,
          wix_order_number:       wo.number,
          created_at:             wo.dateCreated,
        })
        .select('id')
        .single()

      if (orderErr || !order) {
        console.error(`  ✗  #${wo.number}: ${orderErr?.message}`)
        errors++
        continue
      }

      // Insert line items
      const items = wo.lineItems.map((li) => ({
        order_id:   order.id,
        product_id: li.productId ? (productMap.get(li.productId) ?? null) : null,
        quantity:   li.quantity,
        unit_price: parseFloat(li.price),
      }))
      await supabase.from('order_items').insert(items)

      console.log(`  ✓  Inserted #${wo.number} (${statusFromWix(wo.fulfillmentStatus, wo.paymentStatus)})`)
      inserted++
      continue
    }

    // ── UPDATE if wix_order_number or customer_name missing ─────────────────
    const needsUpdate =
      existing.wix_order_number == null || existing.customer_name == null

    if (!needsUpdate) {
      skipped++
      continue
    }

    const { error: upErr } = await supabase
      .from('orders')
      .update({ wix_order_number: wo.number, customer_name: customerName })
      .eq('id', existing.id)

    if (upErr) {
      console.error(`  ✗  Update #${wo.number}: ${upErr.message}`)
      errors++
    } else {
      updated++
      if (updated % 100 === 0) console.log(`   Updated ${updated} orders...`)
    }
  }

  console.log(`\n✅  Done.`)
  console.log(`   Inserted: ${inserted}  |  Updated: ${updated}  |  Skipped: ${skipped}  |  Errors: ${errors}`)
}

main().catch((err) => {
  console.error('❌  backfill-order-fields failed:', err)
  process.exit(1)
})
