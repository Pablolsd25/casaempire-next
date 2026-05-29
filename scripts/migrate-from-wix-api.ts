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
      body: JSON.stringify({ query: { paging: { limit, offset } } }),
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

  // Obtener o crear categorías desde Wix
  const categoryMap = new Map<string, string>() // wixCategoryId → supabase category id

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

      const slug = slugify(col.name)
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

      // Precio
      const price        = parseFloat(product.priceData?.price ?? '0')
      const comparePrice = product.priceData?.compareAtPrice
        ? parseFloat(product.priceData.compareAtPrice)
        : null

      // Stock
      const stock = product.stock?.quantity ?? 0

      // Categoría (primera colección que no sea "All Products")
      const categoryWixId = (product.collectionIds ?? []).find(
        (id: string) => id !== 'all-products'
      )
      const categoryId = categoryWixId ? categoryMap.get(categoryWixId) ?? null : null

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existing) {
        await supabase
          .from('products')
          .update({
            name:             product.name,
            description:      product.description ?? null,
            price,
            compare_at_price: comparePrice,
            stock,
            images:           imageUrls,
            videos:           videoUrls,
            category_id:      categoryId,
            is_active:        product.visible ?? true,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('products').insert({
          name:             product.name,
          slug,
          description:      product.description ?? null,
          price,
          compare_at_price: comparePrice,
          stock,
          images:           imageUrls,
          videos:           videoUrls,
          category_id:      categoryId,
          is_active:        product.visible ?? true,
        })
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
        is_published: post.status === 'PUBLISHED',
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
    price:           string
    compareAtPrice?: string
  }
  stock?: {
    quantity: number
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
