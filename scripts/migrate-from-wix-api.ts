// ============================================================
// migrate-from-wix-api.ts
// Migra productos, imágenes y blog desde la API de Wix
// a Supabase (DB + Storage)
//
// Uso:
//   npm run migrate:api
//
// Variables necesarias en .env.local:
//   WIX_API_KEY=tu_api_key_de_wix
//   WIX_SITE_ID=0c8e6806-c437-4a19-914b-39f9ed9284c6
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Cargar .env.local manualmente ──────────────────────────
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
  console.error('❌ Faltan variables de entorno. Revisa .env.local')
  console.error('   Necesitas: WIX_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const wixHeaders = {
  'Authorization': WIX_API_KEY,
  'wix-site-id':   WIX_SITE_ID,
  'Content-Type':  'application/json',
}

// ─── Helpers ───────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function uploadImageToSupabase(
  buffer: Buffer,
  filename: string,
  folder: 'products' | 'blog'
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('images')
    .upload(`${folder}/${filename}`, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.warn(`  ⚠️  Error subiendo imagen ${filename}:`, error.message)
    return null
  }

  const { data: publicUrl } = supabase.storage
    .from('images')
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}

// ─── 1. Migrar Productos ────────────────────────────────────

async function migrateProducts() {
  console.log('\n📦 Migrando productos desde Wix...')

  let allProducts: WixProduct[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch('https://www.wixapis.com/stores-reader/v1/products/query', {
      method: 'POST',
      headers: wixHeaders,
      body: JSON.stringify({ includeHiddenProducts: true, query: { paging: { limit, offset } } }),
    })

    if (!res.ok) {
      console.error('❌ Error al obtener productos de Wix:', await res.text())
      break
    }

    const data = await res.json() as { products: WixProduct[]; totalResults?: number }
    const products = data.products ?? []
    allProducts = [...allProducts, ...products]

    console.log(`  Obtenidos ${allProducts.length} productos...`)

    if (products.length < limit) break
    offset += limit
  }

  console.log(`  Total encontrado: ${allProducts.length} productos`)

  // ── Mapa: nombre de colección Wix → slug canónico del sitio ─────────────
  // Solo las 3 categorías reales del sitio.
  // "Best Sellers", "Lo Más Vendido" y "Suplementos" son etiquetas cruzadas,
  // no categorías de navegación — se ignoran para category_id.
  // "Nuestras Ofertas" tampoco es una categoría de navegación: los productos
  // se marcan con is_offer = true y conservan su categoría principal.
  const WIX_SLUG_MAP: Record<string, string> = {
    "women's nutrition": 'mujeres',
    'favoritos de ellas': 'mujeres',
    'men nutrition':     'hombres',
    'varones':           'hombres',
  }

  // Slugs que se usan para asignar category_id
  const PRIMARY_SLUGS = new Set(['mujeres', 'hombres'])

  // Colecciones Wix que marcan un producto como oferta (is_offer = true)
  const OFFER_COLLECTION_NAMES = new Set([
    'nuestras ofertas',
  ])
  const ofertasCollIds = new Set<string>()

  // Obtener o crear categorías desde Wix
  const categoryMap   = new Map<string, string>() // wixCollectionId → supabase category id
  const wixIdToSlug   = new Map<string, string>() // wixCollectionId → slug usado

  // Insertar colecciones de Wix como categorías
  const collectionsRes = await fetch('https://www.wixapis.com/stores-reader/v1/collections/query', {
    method: 'POST',
    headers: wixHeaders,
    body: JSON.stringify({ query: { paging: { limit: 50 } } }),
  })

  if (collectionsRes.ok) {
    const colData = await collectionsRes.json() as { collections: WixCollection[] }
    for (const col of colData.collections ?? []) {
      if (col.name === 'All Products') continue

      const nameLower = col.name.toLowerCase()

      // Marcar colecciones que indican "oferta" (is_offer) — no son categorías de navegación
      if (OFFER_COLLECTION_NAMES.has(nameLower)) {
        ofertasCollIds.add(col.id)
        continue // No crear categoría para esta colección
      }

      const slug = WIX_SLUG_MAP[nameLower]
      // Ignorar colecciones que no tienen un slug canónico definido
      // (e.g. "Best Sellers", "Lo Más Vendido", "Suplementos")
      if (!slug) continue

      wixIdToSlug.set(col.id, slug)

      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingCat) {
        categoryMap.set(col.id, existingCat.id)
        continue
      }

      const { data: newCat } = await supabase
        .from('categories')
        .insert({ name: col.name, slug })
        .select('id')
        .single()

      if (newCat) categoryMap.set(col.id, newCat.id)
    }
    console.log(`  ✅ ${categoryMap.size} categorías procesadas`)
  }

  // Insertar productos
  let migratedCount = 0
  let errorCount = 0

  for (const product of allProducts) {
    try {
      const slug = slugify(product.name)

      // Bajar y subir imágenes; recopilar URLs de video
      const imageUrls: string[] = []
      const videoUrls: string[] = []
      for (const media of product.media?.items ?? []) {
        if (media.video?.files?.length) {
          // Elegir la mejor calidad disponible (720p preferido, luego 1080p, luego lo que haya)
          const files = media.video.files.filter((f) => f.url)
          const qualityOrder: Record<string, number> = { '720p': 3, '1080p': 2, '480p': 1 }
          const best = files.sort(
            (a, b) => (qualityOrder[b.quality ?? ''] ?? 0) - (qualityOrder[a.quality ?? ''] ?? 0)
          )[0]
          if (best?.url) videoUrls.push(best.url)
          continue
        }

        const imageUrl = media.image?.url ?? media.image?.id
        if (!imageUrl) continue

        const buffer = await downloadImage(imageUrl)
        if (!buffer) continue

        const filename = `${slug}-${imageUrls.length + 1}.jpg`
        const publicUrl = await uploadImageToSupabase(buffer, filename, 'products')
        if (publicUrl) imageUrls.push(publicUrl)
      }

      // Precio: discountedPrice es lo que el cliente paga; price es el tachado
      const rawPrice     = parseFloat(product.priceData?.price ?? '0')
      const discounted   = parseFloat(product.priceData?.discountedPrice ?? String(rawPrice))
      const price        = discounted > 0 ? discounted : rawPrice
      const comparePrice = discounted < rawPrice
        ? rawPrice
        : (product.priceData?.compareAtPrice
            ? parseFloat(product.priceData.compareAtPrice)
            : null)

      // Stock
      // Si Wix no rastrea cantidad exacta (trackQuantity=false), usa inStock como señal
      const stock = product.stock?.trackQuantity
        ? (product.stock?.quantity ?? 0)
        : (product.stock?.inStock !== false ? 99 : 0)

      // Categoría: solo colecciones primarias (mujeres / hombres)
      const collIds = (product.collectionIds ?? []).filter((id: string) => id !== '00000000-000000-000000-000000000001')
      let categoryId: string | null = null
      for (const id of collIds) {
        const slug = wixIdToSlug.get(id)
        if (slug && PRIMARY_SLUGS.has(slug)) {
          categoryId = categoryMap.get(id) ?? null
          if (categoryId) break
        }
      }

      // is_offer: true si el producto pertenece a alguna colección de ofertas
      const isOffer = collIds.some((id: string) => ofertasCollIds.has(id))

      // Verificar si ya existe (por slug o por wix_id)
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      // Payload base (no incluye wix_id — columna opcional; se agrega si existe)
      const basePayload = {
        name:             product.name,
        description:      product.description ?? null,
        price,
        compare_at_price: comparePrice,
        stock,
        images:           imageUrls,
        videos:           videoUrls,
        category_id:      categoryId,
        is_offer:         isOffer,
        is_active:        product.visible ?? true,
      }

      if (existing) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(basePayload)
          .eq('id', existing.id)
        if (updateErr) throw new Error(`update failed: ${updateErr.message}`)

        // Intentar setear wix_id (falla silenciosamente si la columna no existe aún)
        await supabase.from('products').update({ wix_id: product.id }).eq('id', existing.id)
      } else {
        const { error: insertErr } = await supabase.from('products').insert({
          ...basePayload,
          slug,
        })
        if (insertErr) throw new Error(`insert failed: ${insertErr.message}`)

        // Intentar setear wix_id en la fila recién insertada
        await supabase.from('products').update({ wix_id: product.id }).eq('slug', slug)
      }

      migratedCount++
      console.log(`  ✅ [${migratedCount}/${allProducts.length}] ${product.name}`)
    } catch (err) {
      errorCount++
      console.warn(`  ⚠️  Error con producto "${product.name}":`, err)
    }
  }

  console.log(`\n  Productos migrados: ${migratedCount} ✅  |  Errores: ${errorCount}`)
}

// ─── 2. Migrar Blog ─────────────────────────────────────────

async function migrateBlog() {
  console.log('\n📝 Migrando blog desde Wix...')

  const res = await fetch('https://www.wixapis.com/blog/v3/posts/query', {
    method: 'POST',
    headers: wixHeaders,
    body: JSON.stringify({
      query: { paging: { limit: 100 } },
    }),
  })

  if (!res.ok) {
    console.error('❌ Error al obtener posts del blog:', await res.text())
    return
  }

  const data = await res.json() as { posts: WixPost[] }
  const posts = data.posts ?? []
  console.log(`  Total encontrado: ${posts.length} posts`)

  let migratedCount = 0

  for (const post of posts) {
    try {
      const slug = post.slug ?? slugify(post.title)

      // Imagen de portada
      let coverImageUrl: string | null = null
      if (post.coverMedia?.image?.url) {
        const buffer = await downloadImage(post.coverMedia.image.url)
        if (buffer) {
          const filename = `${slug}-cover.jpg`
          coverImageUrl = await uploadImageToSupabase(buffer, filename, 'blog')
        }
      }

      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .single()

      const postData = {
        title:        post.title,
        slug,
        excerpt:      post.excerpt ?? null,
        content:      post.content ?? post.richContent ?? '',
        cover_image:  coverImageUrl,
        is_published: post.status?.toUpperCase() !== 'DRAFT',
        published_at: post.firstPublishedDate ?? post.publishedDate ?? null,
      }

      if (existing) {
        await supabase.from('blog_posts').update(postData).eq('id', existing.id)
      } else {
        await supabase.from('blog_posts').insert(postData)
      }

      migratedCount++
      console.log(`  ✅ [${migratedCount}/${posts.length}] ${post.title}`)
    } catch (err) {
      console.warn(`  ⚠️  Error con post "${post.title}":`, err)
    }
  }

  console.log(`\n  Posts migrados: ${migratedCount} ✅`)
}

// ─── 3. Asegurar bucket en Supabase Storage ──────────────────

async function ensureStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets ?? []).some((b) => b.name === 'images')

  if (!exists) {
    const { error } = await supabase.storage.createBucket('images', { public: true })
    if (error) {
      console.error('❌ Error creando bucket "images":', error.message)
      process.exit(1)
    }
    console.log('  ✅ Bucket "images" creado en Supabase Storage')
  } else {
    console.log('  ✅ Bucket "images" ya existe')
  }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando migración Wix → Supabase')
  console.log(`   Site ID: ${WIX_SITE_ID}`)
  console.log(`   Supabase: ${SUPABASE_URL}\n`)

  await ensureStorageBucket()
  await migrateProducts()
  await migrateBlog()

  console.log('\n🎉 Migración completada')
}

main().catch((err) => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})

// ─── Tipos de Wix ───────────────────────────────────────────

interface WixProduct {
  id:            string
  name:          string
  description?:  string
  visible?:      boolean
  collectionIds?: string[]
  priceData?: {
    price:             string
    discountedPrice?:  string
    compareAtPrice?:   string
  }
  stock?: {
    trackQuantity?: boolean
    inStock?:       boolean
    quantity?:      number
  }
  media?: {
    items: Array<{
      image?: { url?: string; id?: string }
      video?: {
        files?: Array<{
          url?: string
          format?: string
          quality?: string
        }>
      }
    }>
  }
}

interface WixCollection {
  id:   string
  name: string
}

interface WixPost {
  id:                string
  title:             string
  slug?:             string
  excerpt?:          string
  content?:          string
  richContent?:      string
  status:            string
  firstPublishedDate?: string
  publishedDate?:    string
  coverMedia?: {
    image?: { url?: string }
  }
}
