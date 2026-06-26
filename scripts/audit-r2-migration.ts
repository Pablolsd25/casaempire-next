// Audita URLs de Supabase Storage que quedaron sin migrar
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'images'
const FOLDERS = ['products', 'products/description', 'blog', 'videos', 'categories', 'wix-library']
const SUPABASE_MARKER = 'supabase.co/storage/v1/object/public/images/'

function findSupabaseUrls(text: string): string[] {
  const re = /https:\/\/[^"'\s]+supabase\.co\/storage\/v1\/object\/public\/images\/[^"'\s]+/g
  return text.match(re) ?? []
}

async function countStorageFiles(folder: string): Promise<number> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })
  if (error) return -1
  let n = 0
  for (const f of data ?? []) {
    if (f.id) n++
    else {
      const sub = await countStorageFiles(`${folder}/${f.name}`)
      if (sub >= 0) n += sub
    }
  }
  return n
}

async function main() {
  console.log('🔍 Auditoría post-migración R2\n')

  // Archivos aún en Supabase Storage
  console.log('── Archivos en Supabase Storage (origen) ──')
  let totalSupabase = 0
  for (const folder of FOLDERS) {
    const n = await countStorageFiles(folder)
    totalSupabase += Math.max(n, 0)
    console.log(`  ${folder}/: ${n >= 0 ? n : 'error'} archivos`)
  }
  console.log(`  TOTAL: ${totalSupabase}\n`)

  // URLs supabase en DB
  const leftovers: { table: string; id: string; urls: string[] }[] = []

  const { data: products } = await supabase.from('products').select('id, name, images, videos, description')
  for (const p of products ?? []) {
    const blob = JSON.stringify({ images: p.images, videos: p.videos, description: p.description })
    const urls = findSupabaseUrls(blob)
    if (urls.length) leftovers.push({ table: 'products', id: `${p.name} (${p.id})`, urls })
  }

  const { data: cats } = await supabase.from('categories').select('id, name, image_url')
  for (const c of cats ?? []) {
    const urls = findSupabaseUrls(String(c.image_url ?? ''))
    if (urls.length) leftovers.push({ table: 'categories', id: c.name, urls })
  }

  const { data: posts } = await supabase.from('blog_posts').select('id, title, cover_image, content')
  for (const post of posts ?? []) {
    const blob = `${post.cover_image ?? ''}${post.content ?? ''}`
    const urls = findSupabaseUrls(blob)
    if (urls.length) leftovers.push({ table: 'blog_posts', id: post.title ?? post.id, urls })
  }

  const { data: settings } = await supabase.from('site_settings').select('key, value')
  for (const s of settings ?? []) {
    const urls = findSupabaseUrls(String(s.value ?? ''))
    if (urls.length) leftovers.push({ table: 'site_settings', id: s.key, urls })
  }

  const { data: items } = await supabase.from('order_items').select('id, product_image')
  for (const item of items ?? []) {
    const urls = findSupabaseUrls(String(item.product_image ?? ''))
    if (urls.length) leftovers.push({ table: 'order_items', id: item.id, urls })
  }

  // Resumen por tipo de media en DB
  let r2Count = 0
  let wixCount = 0
  let otherCount = 0
  const allUrls: string[] = []
  for (const p of products ?? []) {
    for (const u of [...(p.images ?? []), ...(p.videos ?? [])]) {
      allUrls.push(u)
      if (u.includes('r2.dev') || u.includes('media.casaempire')) r2Count++
      else if (u.includes('wixstatic') || u.includes('wix.com')) wixCount++
      else otherCount++
    }
  }

  console.log('── URLs en productos (imágenes + videos) ──')
  console.log(`  R2:     ${r2Count}`)
  console.log(`  Wix:    ${wixCount} (externas, no en Storage)`)
  console.log(`  Otras:  ${otherCount}`)

  const { count: blogCount } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true })
  console.log(`\n── Blog ──`)
  console.log(`  Posts en DB: ${blogCount ?? 0}`)
  const blogInStorage = await countStorageFiles('blog')
  console.log(`  Archivos en Supabase blog/: ${blogInStorage}`)
  for (const post of posts ?? []) {
    const cover = (post.cover_image as string) ?? '(sin cover)'
    const host = cover.includes('r2.dev') || cover.includes('media.casaempire')
      ? 'R2'
      : cover.includes('supabase.co/storage')
        ? 'SUPABASE'
        : cover.startsWith('http')
          ? 'externo'
          : 'vacío'
    console.log(`    [${host}] ${(post.title as string)?.slice(0, 50) ?? post.id}`)
  }

  console.log(`\n── URLs Supabase sin migrar en DB ──`)
  if (!leftovers.length) {
    console.log('  ✅ Ninguna — todas las refs apuntan a R2 u otros hosts')
  } else {
    console.log(`  ⚠️  ${leftovers.length} registros con URLs Supabase:`)
    for (const row of leftovers.slice(0, 10)) {
      console.log(`    ${row.table} / ${row.id}: ${row.urls.length} URL(s)`)
      for (const u of row.urls.slice(0, 2)) console.log(`      → ${u.slice(0, 90)}...`)
    }
  }
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
