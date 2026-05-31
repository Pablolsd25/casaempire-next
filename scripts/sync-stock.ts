/**
 * scripts/sync-stock.ts
 *
 * Pulls current inventory from Wix Inventory API and updates stock
 * in Supabase for each matching product (matched by SKU or name).
 *
 * Usage:
 *   npx ts-node -P tsconfig.scripts.json scripts/sync-stock.ts
 *   or: npm run sync:stock
 *
 * Env vars needed:
 *   WIX_API_KEY          — from Wix dashboard → API keys
 *   WIX_ACCOUNT_ID       — your Wix account ID
 *   WIX_SITE_ID          — your Wix site ID
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

const WIX_API  = 'https://www.wixapis.com/stores/v2'
const HEADERS  = {
  'Content-Type':  'application/json',
  'Authorization': process.env.WIX_API_KEY ?? '',
  'wix-account-id': process.env.WIX_ACCOUNT_ID ?? '',
  'wix-site-id':   process.env.WIX_SITE_ID ?? '',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface WixInventoryItem {
  externalId: string          // product ID in Wix
  variants: Array<{
    variantId:        string
    inStock:          boolean
    quantity:         number
  }>
}

async function fetchWixInventory(): Promise<WixInventoryItem[]> {
  const allItems: WixInventoryItem[] = []
  let cursor = ''

  do {
    const body: Record<string, unknown> = { paging: { limit: 100 } }
    if (cursor) body.pagingMetaData = { cursors: { next: cursor } }

    const res = await fetch(`${WIX_API}/inventoryItems/query`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Wix inventory query failed: ${res.status} ${err}`)
    }

    const json = await res.json() as {
      inventoryItems: WixInventoryItem[]
      metadata?: { cursors?: { next?: string } }
    }

    allItems.push(...(json.inventoryItems ?? []))
    cursor = json.metadata?.cursors?.next ?? ''
  } while (cursor)

  return allItems
}

async function fetchWixProducts(): Promise<Map<string, string>> {
  /** Returns a map: wixProductId → productName */
  const map = new Map<string, string>()
  let offset = 0

  while (true) {
    const res = await fetch(`${WIX_API.replace('/v2', '/v1')}/products/query`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify({ query: { paging: { limit: 100, offset } } }),
    })

    if (!res.ok) break

    const json = await res.json() as { products?: Array<{ id: string; name: string }>; totalResults?: number }
    const products = json.products ?? []
    for (const p of products) map.set(p.id, p.name)

    offset += products.length
    if (!json.totalResults || offset >= json.totalResults) break
  }

  return map
}

async function main() {
  console.log('🔄  Fetching Wix inventory...')
  const inventory = await fetchWixInventory()
  console.log(`   Found ${inventory.length} inventory items.`)

  console.log('🔄  Fetching Wix product names...')
  const wixNames = await fetchWixProducts()

  console.log('🔄  Fetching Supabase products...')
  const { data: sbProducts, error } = await supabase
    .from('products')
    .select('id, name')

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`)

  let updated = 0
  let skipped = 0

  for (const item of inventory) {
    // Sum all variant quantities
    const totalQty = item.variants.reduce((acc, v) => acc + (v.quantity ?? 0), 0)
    const wixName  = wixNames.get(item.externalId)

    // Match Supabase product by name (case-insensitive)
    const sbProduct = sbProducts?.find((p) =>
      wixName && p.name.toLowerCase().trim() === wixName.toLowerCase().trim()
    )

    if (!sbProduct) {
      skipped++
      if (wixName) console.warn(`  ⚠  No match for Wix product: "${wixName}"`)
      continue
    }

    const { error: updateErr } = await supabase
      .from('products')
      .update({ stock: totalQty })
      .eq('id', sbProduct.id)

    if (updateErr) {
      console.error(`  ✗  Failed to update ${sbProduct.name}: ${updateErr.message}`)
    } else {
      console.log(`  ✓  ${sbProduct.name}: stock → ${totalQty}`)
      updated++
    }
  }

  console.log(`\n✅  Done. Updated: ${updated}  |  Skipped: ${skipped}`)
}

main().catch((err) => {
  console.error('❌  sync-stock failed:', err)
  process.exit(1)
})
