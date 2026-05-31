// ============================================================
// migrate-category-images.ts
// Descarga las imágenes de cada colección de Wix y las sube
// a Supabase Storage → actualiza categories.image_url
//
// Uso:
//   npm run migrate:categories            (ejecuta)
//   npm run migrate:categories -- --dry-run (solo muestra lo que haría)
//
// Variables necesarias en .env.local:
//   WIX_API_KEY
//   WIX_SITE_ID
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
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
const WIX_API_KEY = process.env.WIX_API_KEY!
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? '0c8e6806-c437-4a19-914b-39f9ed9284c6'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!WIX_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisa .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const wixHeaders = {
  Authorization: WIX_API_KEY,
  'wix-site-id':  WIX_SITE_ID,
  'Content-Type': 'application/json',
}

// ─── Mapa Wix collection name → slug canónico ────────────────
// Incluye también "ofertas" por si existe en Wix
const WIX_SLUG_MAP: Record<string, string> = {
  "women's nutrition":   'mujeres',
  'favoritos de ellas':  'mujeres',
  'men nutrition':       'hombres',
  'varones':             'hombres',
  'nuestras ofertas':    'ofertas',
  'all products':        '_skip',
}

// ─── Helpers ─────────────────────────────────────────────────

async function resolveWixImageUrl(raw: string): Promise<string | null> {
  // Wix puede devolver una URL directa o un wix:image:// URI
  if (raw.startsWith('http')) return raw

  if (raw.startsWith('wix:image://')) {
    // Formato: wix:image://v1/<fileId>/<filename>#originWidth=...
    const withoutScheme = raw.replace('wix:image://v1/', '')
    const fileId = withoutScheme.split('/')[0].split('#')[0]
    // URL pública de imagen estática de Wix
    return `https://static.wixstatic.com/media/${fileId}`
  }

  // Puede ser un fileId directo
  if (!raw.includes('/') && !raw.includes('.')) {
    return `https://static.wixstatic.com/media/${raw}`
  }

  return raw
}

async function downloadBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ⚠️  No se pudo descargar ${url} (HTTP ${res.status})`)
      return null
    }
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    console.warn(`  ⚠️  Error descargando ${url}:`, err)
    return null
  }
}

async function uploadToSupabase(buffer: Buffer, slug: string): Promise<string | null> {
  const storagePath = `categories/${slug}.jpg`
  const { data, error } = await supabase.storage
    .from('images')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    console.warn(`  ⚠️  Error subiendo imagen de categoría "${slug}":`, error.message)
    return null
  }

  const { data: pub } = supabase.storage.from('images').getPublicUrl(data.path)
  return pub.publicUrl
}

// ─── Extraer URL de imagen de un objeto media de Wix ─────────
// La API de colecciones puede devolver distintas formas:
//   col.media.mainMedia.image.url
//   col.media.items[0].image.url
//   col.media.items[0].image.id  (wix:image:// URI)
function extractImageUrl(media: WixMedia | undefined): string | null {
  if (!media) return null

  const main = media.mainMedia
  if (main?.image?.url) return main.image.url
  if (main?.image?.id)  return main.image.id

  const first = media.items?.[0]
  if (first?.image?.url) return first.image.url
  if (first?.image?.id)  return first.image.id

  return null
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Migración de imágenes de categorías${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`   Site ID: ${WIX_SITE_ID}\n`)

  // 1. Obtener colecciones de Wix
  const res = await fetch('https://www.wixapis.com/stores-reader/v1/collections/query', {
    method: 'POST',
    headers: wixHeaders,
    body: JSON.stringify({ query: { paging: { limit: 50 } } }),
  })

  if (!res.ok) {
    console.error('❌ Error al obtener colecciones de Wix:', await res.text())
    process.exit(1)
  }

  const colData = await res.json() as { collections: WixCollection[] }
  const collections = colData.collections ?? []
  console.log(`📋 Colecciones encontradas en Wix: ${collections.length}`)

  // 2. Mostrar todas para diagnóstico
  for (const col of collections) {
    const rawUrl = extractImageUrl(col.media)
    const slug = WIX_SLUG_MAP[col.name.toLowerCase()] ?? null
    console.log(`  "${col.name}" → slug: ${slug ?? '(ignorada)'} | imagen raw: ${rawUrl ?? '(sin imagen)'}`)
  }

  console.log()

  // 3. Obtener categorías actuales de Supabase
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name, image_url')

  if (catErr) {
    console.error('❌ Error al obtener categorías de Supabase:', catErr.message)
    process.exit(1)
  }

  const catBySlug = new Map(categories!.map(c => [c.slug, c]))
  console.log(`📋 Categorías en Supabase: ${categories!.length}`)
  for (const c of categories!) {
    console.log(`  "${c.name}" (${c.slug}) | image_url actual: ${c.image_url ?? '(vacía)'}`)
  }
  console.log()

  // 4. Procesar cada colección con imagen
  let updated = 0
  let skipped = 0

  for (const col of collections) {
    const nameLower = col.name.toLowerCase()
    const slug = WIX_SLUG_MAP[nameLower]

    if (!slug || slug === '_skip') {
      skipped++
      continue
    }

    const cat = catBySlug.get(slug)
    if (!cat) {
      console.warn(`  ⚠️  No se encontró categoría con slug "${slug}" en Supabase`)
      skipped++
      continue
    }

    const rawUrl = extractImageUrl(col.media)
    if (!rawUrl) {
      console.warn(`  ⚠️  Colección "${col.name}" no tiene imagen en Wix`)
      skipped++
      continue
    }

    const resolvedUrl = await resolveWixImageUrl(rawUrl)
    if (!resolvedUrl) {
      console.warn(`  ⚠️  No se pudo resolver la URL de imagen para "${col.name}"`)
      skipped++
      continue
    }

    console.log(`📥 "${col.name}" (${slug}) → ${resolvedUrl}`)

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Se subiría a images/categories/${slug}.jpg`)
      updated++
      continue
    }

    const buffer = await downloadBuffer(resolvedUrl)
    if (!buffer) { skipped++; continue }

    const publicUrl = await uploadToSupabase(buffer, slug)
    if (!publicUrl) { skipped++; continue }

    const { error: updateErr } = await supabase
      .from('categories')
      .update({ image_url: publicUrl })
      .eq('id', cat.id)

    if (updateErr) {
      console.warn(`  ❌ Error actualizando image_url para "${slug}":`, updateErr.message)
      skipped++
      continue
    }

    console.log(`  ✅ Actualizado: ${publicUrl}`)
    updated++
  }

  console.log(`\n🎉 Completado | Actualizadas: ${updated} | Saltadas: ${skipped}`)

  if (updated === 0 && !DRY_RUN) {
    console.log('\n💡 Si Wix no devolvió imágenes para las colecciones, puedes subir')
    console.log('   las imágenes manualmente desde /admin/categorias en el editor de cada categoría.')
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})

// ─── Tipos ───────────────────────────────────────────────────

interface WixImage {
  url?: string
  id?:  string
}

interface WixMediaItem {
  image?:     WixImage
  mediaType?: string
}

interface WixMedia {
  mainMedia?: WixMediaItem
  items?:     WixMediaItem[]
}

interface WixCollection {
  id:    string
  name:  string
  media?: WixMedia
}
