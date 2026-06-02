// ============================================================
// migrate-variants.ts
// Migra las opciones de producto (variantes) desde Wix API
// hacia las tablas product_options y product_option_values en Supabase
//
// Uso:
//   npx tsx scripts/migrate-variants.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Cargar .env.local ──────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const WIX_API_KEY  = process.env.WIX_API_KEY!
const WIX_SITE_ID  = process.env.WIX_SITE_ID ?? '0c8e6806-c437-4a19-914b-39f9ed9284c6'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!WIX_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables en .env.local: WIX_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const wixHeaders = {
  'Authorization': WIX_API_KEY,
  'wix-site-id':   WIX_SITE_ID,
  'Content-Type':  'application/json',
}

interface WixChoice {
  value: string
  description?: string
}

interface WixProductOption {
  name: string
  optionType: string
  choices: WixChoice[]
}

interface WixProduct {
  id: string
  name: string
  productOptions?: WixProductOption[]
}

// ─── Fetch ALL Wix products ─────────────────────────────────
async function fetchAllWixProducts(): Promise<WixProduct[]> {
  let all: WixProduct[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch('https://www.wixapis.com/stores-reader/v1/products/query', {
      method: 'POST',
      headers: wixHeaders,
      body: JSON.stringify({
        includeHiddenProducts: true,
        query: { paging: { limit, offset } },
      }),
    })

    if (!res.ok) {
      console.error('❌ Error Wix API:', await res.text())
      break
    }

    const data = await res.json() as { products: WixProduct[] }
    const batch = data.products ?? []
    all = [...all, ...batch]
    console.log(`  Obtenidos ${all.length} productos de Wix...`)

    if (batch.length < limit) break
    offset += limit
  }

  return all
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('\n🔄 Migrando variantes de Wix → Supabase...\n')

  // 1. Obtener todos los productos de Wix con opciones
  const wixProducts = await fetchAllWixProducts()
  const withOptions = wixProducts.filter(p => (p.productOptions ?? []).length > 0)
  console.log(`\n✅ ${wixProducts.length} productos en Wix, ${withOptions.length} tienen variantes\n`)

  // 2. Obtener todos los productos de Supabase (id + wix_id + slug + name)
  const { data: supabaseProducts, error: spErr } = await supabase
    .from('products')
    .select('id, wix_id, slug, name')

  if (spErr || !supabaseProducts) {
    console.error('❌ Error leyendo productos de Supabase:', spErr?.message)
    process.exit(1)
  }

  const byWixId = new Map(supabaseProducts.map(p => [p.wix_id, p.id]))
  const byName  = new Map(supabaseProducts.map(p => [p.name.toLowerCase().trim(), p.id]))

  let migrated = 0
  let skipped  = 0
  let notFound = 0

  for (const wp of withOptions) {
    // Encontrar el producto en Supabase
    const supabaseId = byWixId.get(wp.id) ?? byName.get(wp.name.toLowerCase().trim())

    if (!supabaseId) {
      console.warn(`  ⚠️  No encontrado en Supabase: "${wp.name}" (wix_id: ${wp.id})`)
      notFound++
      continue
    }

    const opts = wp.productOptions ?? []
    if (opts.length === 0) { skipped++; continue }

    console.log(`  📦 ${wp.name} → ${opts.length} opción(es)`)
    for (const o of opts) {
      console.log(`      · ${o.name}: ${o.choices.map(c => c.value).join(', ')}`)
    }

    // Borrar opciones existentes para este producto (evita duplicados)
    await supabase.from('product_options').delete().eq('product_id', supabaseId)

    // Insertar opciones
    const { data: insertedOpts, error: optErr } = await supabase
      .from('product_options')
      .insert(opts.map((o, i) => ({ product_id: supabaseId, name: o.name, sort_order: i })))
      .select()

    if (optErr || !insertedOpts) {
      console.error(`  ❌ Error insertando opciones para "${wp.name}":`, optErr?.message)
      continue
    }

    // Insertar valores
    const allValues = opts.flatMap((o, oi) =>
      o.choices.map((c, ci) => ({
        option_id: insertedOpts[oi].id,
        value: c.value.toUpperCase(),
        sort_order: ci,
      }))
    )

    if (allValues.length > 0) {
      const { error: valErr } = await supabase.from('product_option_values').insert(allValues)
      if (valErr) {
        console.error(`  ❌ Error insertando valores para "${wp.name}":`, valErr.message)
        continue
      }
    }

    migrated++
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migrados:   ${migrated} productos
⏭️  Sin opciones: ${skipped}
❌ No encontrados en Supabase: ${notFound}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(console.error)
