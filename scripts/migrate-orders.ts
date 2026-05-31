/**
 * scripts/migrate-orders.ts
 *
 * Fetches all PAID orders from Wix Stores v2 API (offset pagination)
 * and inserts them into Supabase (orders + order_items tables).
 *
 * Idempotent: skips orders whose openpay_transaction_id = "wix_<wixOrderId>"
 * already exists in Supabase.
 *
 * Usage:
 *   npm run migrate:orders
 *
 * Env vars needed:
 *   WIX_API_KEY
 *   WIX_ACCOUNT_ID
 *   WIX_SITE_ID
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

// Stores v2 — offset pagination works correctly here
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

// ─── Wix Stores v2 types ─────────────────────────────────────────────────────

interface WixAddress {
  fullName?:    { firstName?: string; lastName?: string }
  country?:     string
  subdivision?: string
  city?:        string
  zipCode?:     string
  phone?:       string
  email?:       string
  addressLine1?: string
}

interface WixLineItemV2 {
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
  totals: {
    subtotal: string
    shipping: string
    total:    string
  }
  buyerInfo?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?:  string
  }
  billingInfo?: {
    address?: WixAddress
  }
  shippingInfo?: {
    shipmentDetails?: {
      address?: WixAddress
    }
  }
  lineItems: WixLineItemV2[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wixStatusToSupabase(fulfillment: string, payment: string): string {
  if (payment === 'PAID') {
    if (fulfillment === 'FULFILLED')           return 'delivered'
    if (fulfillment === 'PARTIALLY_FULFILLED') return 'shipped'
    return 'paid'
  }
  if (payment === 'CANCELED' || fulfillment === 'CANCELED') return 'cancelled'
  return 'pending'
}

async function fetchWixOrdersPage(offset: number, limit = 100): Promise<{
  orders: WixOrderV2[]
  total:  number
}> {
  const res = await fetch(WIX_ORDERS_API, {
    method:  'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query: {
        filter: JSON.stringify({ paymentStatus: 'PAID' }),
        paging: { limit, offset },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Wix orders query failed: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    orders?:       WixOrderV2[]
    totalResults?: number
  }

  return {
    orders: json.orders ?? [],
    total:  json.totalResults ?? 0,
  }
}

async function fetchSupabaseProductMap(): Promise<Map<string, string>> {
  /** Returns: wixProductId → supabase product UUID */
  const { data } = await supabase.from('products').select('id, wix_id')
  const map = new Map<string, string>()
  for (const p of data ?? []) {
    if (p.wix_id) map.set(p.wix_id, p.id)
  }
  return map
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Build set of already-migrated wix order IDs (idempotency)
  console.log('🔄  Fetching existing Wix orders from Supabase...')
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('openpay_transaction_id')
    .like('openpay_transaction_id', 'wix_%')

  const migratedIds = new Set(
    (existingOrders ?? []).map((o) => o.openpay_transaction_id as string)
  )
  console.log(`   Already migrated: ${migratedIds.size}`)

  const productMap = await fetchSupabaseProductMap()
  console.log(`   Product map size: ${productMap.size}`)

  let inserted = 0
  let skipped  = 0
  let errors   = 0
  let offset   = 0
  const limit  = 100
  let total    = Infinity

  console.log('🔄  Fetching Wix orders (Stores v2, offset pagination)...')

  while (offset < total) {
    const { orders, total: pageTotal } = await fetchWixOrdersPage(offset, limit)

    if (offset === 0) {
      total = pageTotal
      console.log(`   Total PAID orders on Wix: ${total}`)
    }

    if (orders.length === 0) break

    for (const wo of orders) {
      const wixRef = `wix_${wo.id}`

      if (migratedIds.has(wixRef)) {
        skipped++
        continue
      }

      const addr =
        wo.shippingInfo?.shipmentDetails?.address ??
        wo.billingInfo?.address

      const shippingAddress = addr ? {
        street:     addr.addressLine1 ?? '',
        city:       addr.city ?? '',
        state:      addr.subdivision ?? '',
        postalCode: addr.zipCode ?? '',
        country:    addr.country ?? 'MX',
        phone:      addr.phone ?? wo.buyerInfo?.phone ?? '',
      } : null

      const subtotal     = parseFloat(wo.totals.subtotal)
      const shippingCost = parseFloat(wo.totals.shipping)
      const total_amount = parseFloat(wo.totals.total)

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          profile_id:             null,
          status:                 wixStatusToSupabase(wo.fulfillmentStatus, wo.paymentStatus),
          subtotal,
          shipping_cost:          shippingCost,
          total:                  total_amount,
          openpay_transaction_id: wixRef,
          shipping_address:       shippingAddress,
          customer_email:         wo.buyerInfo?.email ?? addr?.email ?? null,
          customer_name: [wo.buyerInfo?.firstName, wo.buyerInfo?.lastName]
            .filter(Boolean).join(' ').trim() || null,
          wix_order_number: wo.number,
          created_at:             wo.dateCreated,
        })
        .select('id')
        .single()

      if (orderErr || !order) {
        console.error(`  ✗  Order #${wo.number} (${wo.id}): ${orderErr?.message}`)
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

      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) {
        console.warn(`  ⚠  Order #${wo.number}: items insert failed — ${itemsErr.message}`)
      }

      inserted++
      if (inserted % 50 === 0) {
        console.log(`  ✓  ${inserted} inserted (offset ${offset + orders.indexOf(wo) + 1}/${total})...`)
      }
    }

    offset += orders.length
    console.log(`  📦  Processed ${Math.min(offset, total)}/${total}`)
  }

  console.log(`\n✅  Done. Inserted: ${inserted}  |  Skipped: ${skipped}  |  Errors: ${errors}`)
}

main().catch((err) => {
  console.error('❌  migrate-orders failed:', err)
  process.exit(1)
})
