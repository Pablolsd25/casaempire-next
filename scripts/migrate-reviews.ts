// ============================================================
// migrate-reviews.ts
// Migra reseñas de productos desde Wix → tabla reviews en Supabase
//
// Uso:
//   npm run migrate:reviews               (ejecuta)
//   npm run migrate:reviews -- --dry-run  (solo muestra)
//   npm run migrate:reviews -- --debug    (muestra primera respuesta cruda)
//
// Requiere: tabla reviews creada (supabase/migrations/20260531_reviews.sql)
// La API de reviews de Wix puede requerir permiso adicional en la API key.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Cargar .env.local ───────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const DRY_RUN     = process.argv.includes('--dry-run')
const DEBUG       = process.argv.includes('--debug')
const WIX_API_KEY = process.env.WIX_API_KEY!
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? '0c8e6806-c437-4a19-914b-39f9ed9284c6'
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!WIX_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisa .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const WIX_HEADERS: Record<string, string> = {
  'Content-Type':   'application/json',
  'Authorization':  WIX_API_KEY,
  'wix-site-id':    WIX_SITE_ID,
}
if (WIX_ACCOUNT_ID) WIX_HEADERS['wix-account-id'] = WIX_ACCOUNT_ID

// ─── Tipos ───────────────────────────────────────────────────

interface WixReview {
  id:          string
  entityId:    string          // productId en Wix
  author?: {
    authorName?: string
    email?:      string
  }
  content?: {
    title?:   string
    body?:    string
    rating?:  number
  }
  createdDate?: string
}

interface WixReviewsResponse {
  reviews?:       WixReview[]
  pagingMetadata?: {
    count?:   number
    offset?:  number
    total?:   number
    hasNext?: boolean
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Migración de reseñas Wix → Supabase${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`   Site ID: ${WIX_SITE_ID}\n`)

  // Precargar mapa wix_id → supabase product_id
  const { data: products } = await supabase
    .from('products')
    .select('id, wix_id')
    .not('wix_id', 'is', null)

  const wixIdToProductId = new Map<string, string>()
  for (const p of products ?? []) {
    if (p.wix_id) wixIdToProductId.set(p.wix_id, p.id)
  }
  console.log(`📦 Productos con wix_id: ${wixIdToProductId.size}`)

  let offset   = 0
  let total    = Infinity
  let inserted = 0
  let skipped  = 0
  let errored  = 0
  let page     = 0
  const LIMIT  = 100

  while (offset < total) {
    page++

    const res = await fetch('https://www.wixapis.com/product-reviews/v1/reviews/query', {
      method:  'POST',
      headers: WIX_HEADERS,
      body:    JSON.stringify({
        query: { paging: { limit: LIMIT, offset } },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`❌ Error HTTP ${res.status}:`, text)
      if (res.status === 403) {
        console.error('\n💡 403 = la API key no tiene permiso de Product Reviews.')
        console.error('   Wix Dashboard → Configuración → API Keys → habilitar "Stores - Read Reviews".')
      }
      if (res.status === 404) {
        console.error('\n💡 404 = El sitio puede no tener reseñas o el endpoint no está disponible.')
      }
      process.exit(1)
    }

    const json = await res.json() as WixReviewsResponse

    if (DEBUG && page === 1) {
      console.log('\n🔍 Primera respuesta cruda:')
      console.log(JSON.stringify(json, null, 2).slice(0, 2000))
      console.log()
    }

    const reviews = json.reviews ?? []
    const meta    = json.pagingMetadata

    if (page === 1) {
      total = meta?.total ?? reviews.length
      console.log(`📋 Total de reseñas en Wix: ${total}`)
    }

    if (reviews.length === 0) break

    console.log(`  Página ${page} (offset ${offset}): ${reviews.length} reseñas...`)

    if (!DRY_RUN) {
      const rows = reviews.map(r => {
        const productId = wixIdToProductId.get(r.entityId) ?? null
        return {
          wix_review_id:    r.id,
          product_id:       productId,
          reviewer_name:    r.author?.authorName ?? null,
          reviewer_email:   r.author?.email ?? null,
          rating:           r.content?.rating ?? 5,
          title:            r.content?.title ?? null,
          comment:          r.content?.body ?? null,
          is_approved:      true,   // las reseñas de Wix ya eran públicas
          wix_created_date: r.createdDate ?? null,
        }
      })

      const { error } = await supabase
        .from('reviews')
        .upsert(rows, { onConflict: 'wix_review_id', ignoreDuplicates: false })

      if (error) {
        errored += reviews.length
        console.warn(`  ⚠️  Error en batch:`, error.message)
      } else {
        inserted += reviews.length
      }
    } else {
      if (page === 1 && reviews[0]) {
        console.log('  Ejemplo:', JSON.stringify({
          id: reviews[0].id,
          productId: reviews[0].entityId,
          rating: reviews[0].content?.rating,
          author: reviews[0].author?.authorName,
        }, null, 2))
      }
      inserted += reviews.length
    }

    offset += reviews.length
    if (!meta?.hasNext || reviews.length < LIMIT) break
  }

  console.log(`\n🎉 Completado`)
  console.log(`   ${DRY_RUN ? 'Encontradas' : 'Insertadas/actualizadas'}: ${inserted}`)
  if (skipped > 0) console.log(`   Saltadas (sin product_id): ${skipped}`)
  if (errored > 0) console.log(`   Errores: ${errored}`)
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
