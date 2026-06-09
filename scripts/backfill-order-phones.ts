/**
 * Rellena customer_phone y customer_email en órdenes migradas de Wix.
 *
 *   npm run backfill:order-phones
 *   npm run backfill:order-phones -- --dry-run
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'
import { normalizeMexicanPhone } from '../src/lib/checkout-validation'

const DRY_RUN = process.argv.includes('--dry-run')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  const key = t.slice(0, i).trim()
  const val = t.slice(i + 1).trim()
  if (key && !process.env[key]) process.env[key] = val
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WIX_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: process.env.WIX_API_KEY ?? '',
  'wix-account-id': process.env.WIX_ACCOUNT_ID ?? '',
  'wix-site-id': process.env.WIX_SITE_ID ?? '',
}

interface WixOrder {
  id: string
  number: number
  buyerInfo?: { email?: string }
  billingInfo?: { address?: { email?: string } }
  shippingInfo?: { shipmentDetails?: { address?: { email?: string } } }
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim().toLowerCase()
  return email && EMAIL_RE.test(email) ? email : null
}

function emailFromShipping(addr: Record<string, string> | null): string | null {
  if (!addr) return null
  for (const key of ['email', 'Email', 'correo']) {
    const found = normalizeEmail(addr[key])
    if (found) return found
  }
  return null
}

async function fetchWixEmailMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!process.env.WIX_API_KEY) {
    console.log('   ⚠ Sin WIX_API_KEY — solo se usará shipping_address.email')
    return map
  }

  let offset = 0
  const limit = 100
  let total = Infinity

  while (offset < total) {
    const res = await fetch('https://www.wixapis.com/stores/v2/orders/query', {
      method: 'POST',
      headers: WIX_HEADERS,
      body: JSON.stringify({ query: { paging: { limit, offset } } }),
    })
    if (!res.ok) throw new Error(`Wix orders failed: ${res.status}`)
    const json = (await res.json()) as { orders?: WixOrder[]; totalResults?: number }
    const orders = json.orders ?? []
    if (orders.length === 0) break

    for (const wo of orders) {
      const addr =
        wo.shippingInfo?.shipmentDetails?.address ??
        wo.billingInfo?.address
      const email = normalizeEmail(wo.buyerInfo?.email ?? addr?.email)
      if (email) map.set(wo.id, email)
    }

    if (offset === 0) total = json.totalResults ?? 0
    offset += orders.length
    if (offset % 500 === 0) console.log(`   Wix: ${offset}/${total}…`)
  }

  console.log(`   Wix emails encontrados: ${map.size}`)
  return map
}

async function main() {
  console.log(`📞 Backfill customer_phone + customer_email${DRY_RUN ? ' (DRY RUN)' : ''}`)

  let hasPhoneColumn = true
  let orders: Array<{
    id: string
    wix_order_number: number | null
    customer_phone?: string | null
    customer_email: string | null
    shipping_address: unknown
    openpay_transaction_id: string | null
  }> | null = null

  const fullSelect = await supabase
    .from('orders')
    .select('id, wix_order_number, customer_phone, customer_email, shipping_address, openpay_transaction_id')

  if (fullSelect.error?.message.includes('customer_phone')) {
    hasPhoneColumn = false
    console.log('   ⚠ Sin columna customer_phone — solo se rellenará customer_email')
    const emailOnly = await supabase
      .from('orders')
      .select('id, wix_order_number, customer_email, shipping_address, openpay_transaction_id')
    if (emailOnly.error) throw emailOnly.error
    orders = emailOnly.data
  } else if (fullSelect.error) {
    throw fullSelect.error
  } else {
    orders = fullSelect.data
  }

  const wixEmailMap = await fetchWixEmailMap()

  let phoneUpdated = 0
  let emailUpdated = 0
  let skipped = 0

  for (const order of orders ?? []) {
    const addr = order.shipping_address as Record<string, string> | null
    const patch: { customer_phone?: string; customer_email?: string; shipping_address?: Record<string, string> } = {}

    if (hasPhoneColumn && !order.customer_phone) {
      const phone = normalizeMexicanPhone(
        addr?.phone ?? addr?.Phone ?? addr?.telefono ?? ''
      )
      if (phone) patch.customer_phone = phone
    }

    if (!order.customer_email) {
      let email = emailFromShipping(addr)

      if (!email && order.openpay_transaction_id?.startsWith('wix_')) {
        const wixId = order.openpay_transaction_id.replace('wix_', '')
        email = wixEmailMap.get(wixId) ?? null
      }

      if (email) {
        patch.customer_email = email
        if (addr && !emailFromShipping(addr)) {
          patch.shipping_address = { ...addr, email }
        }
      }
    }

    if (!hasPhoneColumn) delete patch.customer_phone
    if (Object.keys(patch).length === 0) {
      skipped++
      continue
    }

    const label = `#${order.wix_order_number ?? order.id}`
    if (DRY_RUN) {
      console.log(`  → ${label}:`, patch)
      if (patch.customer_phone) phoneUpdated++
      if (patch.customer_email) emailUpdated++
      continue
    }

    const { error: upErr } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', order.id)

    if (upErr) {
      console.error(`  ✗ ${order.id}:`, upErr.message)
    } else {
      if (patch.customer_phone) phoneUpdated++
      if (patch.customer_email) emailUpdated++
      if ((phoneUpdated + emailUpdated) % 50 === 0) {
        console.log(`  … tel: ${phoneUpdated} · correo: ${emailUpdated}`)
      }
    }
  }

  console.log(
    `\n✅ Listo. Teléfonos: ${phoneUpdated} · Correos: ${emailUpdated} · Sin cambios: ${skipped}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
