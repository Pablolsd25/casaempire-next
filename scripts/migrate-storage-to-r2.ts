// ============================================================
// migrate-storage-to-r2.ts
// Copia el bucket Supabase `images` → Cloudflare R2 y reescribe URLs en DB.
//
// Setup Cloudflare (una vez):
//   1. R2 → Create bucket (ej. casaempire-media)
//   2. R2 → Manage R2 API Tokens → Create (Object Read & Write)
//   3. R2 → bucket → Settings → Public access → Custom domain o r2.dev
//   4. Añade las vars en .env.local (ver .env.example)
//
// Uso:
//   npm run migrate:r2           # copia archivos + actualiza DB
//   npm run migrate:r2:dry       # solo muestra qué haría
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { r2PublicUrl, r2Put } from '../src/lib/r2'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const DRY = process.argv.includes('--dry-run')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OLD_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/images/`
const NEW_PREFIX = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL!.replace(/\/$/, '')}/`

const BUCKET = 'images'
const FOLDERS = ['products', 'products/description', 'blog', 'videos', 'categories', 'wix-library']

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function rewriteUrl(url: string): string {
  if (!url || !url.includes('supabase.co/storage/v1/object/public/images/')) return url
  const key = url.split('/storage/v1/object/public/images/')[1]?.split('?')[0]
  return key ? r2PublicUrl(key) : url
}

function rewriteUrls(urls: string[] | null): string[] | null {
  if (!urls) return urls
  return urls.map(rewriteUrl)
}

async function listAllKeys(folder: string): Promise<string[]> {
  const keys: string[] = []
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })
  if (error) throw new Error(`${folder}: ${error.message}`)

  for (const f of data ?? []) {
    if (!f.id) {
      const nested = await listAllKeys(`${folder}/${f.name}`)
      keys.push(...nested)
      continue
    }
    keys.push(`${folder}/${f.name}`)
  }
  return keys
}

async function copyObject(key: string): Promise<void> {
  if (DRY) {
    console.log(`  · ${key}`)
    return
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(key)
  if (error || !data) throw new Error(`download ${key}: ${error?.message}`)
  const buffer = Buffer.from(await data.arrayBuffer())
  const contentType = data.type || 'application/octet-stream'
  await r2Put(key, buffer, contentType)
  console.log(`  ✓ ${key} (${buffer.length} B)`)
}

async function updateDbUrls(): Promise<void> {
  const { data: products } = await supabase.from('products').select('id, images, videos')
  for (const p of products ?? []) {
    const images = rewriteUrls(p.images as string[] | null)
    const videos = rewriteUrls(p.videos as string[] | null)
    if (images !== p.images || videos !== p.videos) {
      if (!DRY) await supabase.from('products').update({ images, videos }).eq('id', p.id)
      console.log(`  product ${p.id}`)
    }
  }

  const { data: cats } = await supabase.from('categories').select('id, image_url')
  for (const c of cats ?? []) {
    const image_url = rewriteUrl(c.image_url as string)
    if (image_url !== c.image_url) {
      if (!DRY) await supabase.from('categories').update({ image_url }).eq('id', c.id)
      console.log(`  category ${c.id}`)
    }
  }

  const { data: posts } = await supabase.from('blog_posts').select('id, cover_image, content')
  for (const post of posts ?? []) {
    let cover_image = rewriteUrl(post.cover_image as string)
    let content = post.content as string
    if (content?.includes(OLD_PREFIX)) {
      content = content.split(OLD_PREFIX).join(NEW_PREFIX)
    }
    if (cover_image !== post.cover_image || content !== post.content) {
      if (!DRY) await supabase.from('blog_posts').update({ cover_image, content }).eq('id', post.id)
      console.log(`  blog ${post.id}`)
    }
  }

  const { data: settings } = await supabase.from('site_settings').select('key, value')
  for (const s of settings ?? []) {
    const value = typeof s.value === 'string' ? rewriteUrl(s.value) : s.value
    if (value !== s.value) {
      if (!DRY) await supabase.from('site_settings').update({ value }).eq('key', s.key)
      console.log(`  setting ${s.key}`)
    }
  }

  const { data: items } = await supabase.from('order_items').select('id, product_image')
  for (const item of items ?? []) {
    const product_image = rewriteUrl(item.product_image as string)
    if (product_image !== item.product_image) {
      if (!DRY) await supabase.from('order_items').update({ product_image }).eq('id', item.id)
    }
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltan vars de Supabase en .env.local')
    process.exit(1)
  }
  if (!process.env.NEXT_PUBLIC_R2_PUBLIC_URL || !process.env.R2_BUCKET_NAME) {
    console.error('❌ Configura R2 en .env.local antes de migrar (ver .env.example)')
    process.exit(1)
  }

  console.log(DRY ? '🧪 DRY RUN — migrate Supabase Storage → R2\n' : '🚀 Migrando Supabase Storage → R2\n')
  console.log(`  Origen:  ${OLD_PREFIX}`)
  console.log(`  Destino: ${NEW_PREFIX}\n`)

  let total = 0
  for (const folder of FOLDERS) {
    console.log(`📁 ${folder}/`)
    const keys = await listAllKeys(folder)
    total += keys.length
    for (const key of keys) await copyObject(key)
  }

  console.log(`\n📝 Actualizando URLs en DB (${total} archivos copiados)…`)
  await updateDbUrls()

  console.log(DRY ? '\n✅ Dry run listo. Quita --dry-run para ejecutar.' : '\n✅ Migración completa.')
  if (!DRY) {
    console.log('\nSiguiente: despliega con las vars R2 y deja de servir media desde Supabase.')
  }
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
