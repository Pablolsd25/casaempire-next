/**
 * scripts/sync-fulfillment.ts
 *
 * Re-syncs fulfillment status for all orders that have status='paid' in Supabase
 * but may now be FULFILLED or PARTIALLY_FULFILLED in Wix (orders fulfilled after migration).
 *
 * Usage:
 *   npm run sync:fulfillment
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

function wixStatusToSupabase(fulfillment: string, payment: string): string {
  if (payment === 'PAID') {
    if (fulfillment === 'FULFILLED')           return 'delivered'
    if (fulfillment === 'PARTIALLY_FULFILLED') return 'shipped'
    return 'paid'
  }
  if (payment === 'CANCELED' || fulfillment === 'CANCELED') return 'cancelled'
  return 'pending'
}

async function main() {
  // Load all 'paid' orders from DB (these are PAID but NOT_FULFILLED at migration time)
  console.log('🔄  Loading paid orders from Supabase...')
  const { data: paidOrders, error } = await supabase
    .from('orders')
    .select('id, wix_order_number, openpay_transaction_id')
    .eq('status', 'paid')
    .like('openpay_transaction_id', 'wix_%')

  if (error) throw error
  if (!paidOrders?.length) {
    console.log('✅  No paid orders to sync.')
    return
  }
  console.log(`   Found ${paidOrders.length} paid orders to check.`)

  // Build map: wix UUID → supabase id
  const wixIdToSbId = new Map<string, string>()
  for (const o of paidOrders) {
    const wixId = (o.openpay_transaction_id as string).replace('wix_', '')
    wixIdToSbId.set(wixId, o.id)
  }

  // Fetch current status from Wix in batches of 100
  const wixIds = [...wixIdToSbId.keys()]
  let updated = 0, unchanged = 0, errors = 0

  for (let i = 0; i < wixIds.length; i += 100) {
    const batch = wixIds.slice(i, i + 100)
    const res = await fetch(WIX_ORDERS_API, {
      method:  'POST',
      headers: HEADERS,
      body: JSON.stringify({
        query: {
          filter: JSON.stringify({ id: { $in: batch } }),
          paging: { limit: 100, offset: 0 },
        },
      }),
    })

    if (!res.ok) {
      console.error(`Wix API error: ${res.status}`)
      errors++
      continue
    }

    const json = await res.json() as { orders?: Array<{ id: string; number: number; paymentStatus: string; fulfillmentStatus: string }> }

    for (const wo of json.orders ?? []) {
      const newStatus = wixStatusToSupabase(wo.fulfillmentStatus, wo.paymentStatus)
      if (newStatus === 'paid') {
        unchanged++
        continue
      }

      const sbId = wixIdToSbId.get(wo.id)
      if (!sbId) continue

      const { error: upErr } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', sbId)

      if (upErr) {
        console.error(`  ✗  #${wo.number}: ${upErr.message}`)
        errors++
      } else {
        console.log(`  ✓  #${wo.number}: paid → ${newStatus}`)
        updated++
      }
    }
  }

  console.log(`\n✅  Done.  Updated: ${updated}  |  Unchanged: ${unchanged}  |  Errors: ${errors}`)
}

main().catch((err) => {
  console.error('❌  sync-fulfillment failed:', err)
  process.exit(1)
})
