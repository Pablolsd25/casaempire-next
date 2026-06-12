// ============================================================
// audit-supabase-egress.ts
// Diagnóstico de consumo: URLs en DB, videos home, tamaño Storage
//
// Uso:
//   npm run audit:egress
// ============================================================

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'images'
const STORAGE_FOLDERS = ['products', 'products/description', 'blog', 'videos', 'wix-library', 'categories']

function formatBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

async function folderStats(folder: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    return { folder, files: 0, bytes: 0, error: error.message, topFiles: [] as string[] }
  }

  let bytes = 0
  let files = 0
  const sized: { name: string; size: number }[] = []

  for (const f of data ?? []) {
    if (!f.id) continue
    files++
    const size = (f.metadata?.size as number) ?? 0
    bytes += size
    sized.push({ name: f.name, size })
  }

  sized.sort((a, b) => b.size - a.size)
  const topFiles = sized.slice(0, 5).map((f) => `${f.name} (${formatBytes(f.size)})`)

  return { folder, files, bytes, error: null, topFiles }
}

async function main() {
  console.log('📊 Diagnóstico de Cached Egress — Supabase\n')
  console.log(`Proyecto: ${SUPABASE_URL}\n`)

  // ── URLs en productos ──
  const { data: products } = await supabase.from('products').select('id, name, images, videos')

  let imgsSupabase = 0
  let imgsWix = 0
  let vidsSupabase = 0
  let vidsWix = 0

  for (const p of products ?? []) {
    for (const url of p.images ?? []) {
      if (url.includes('supabase.co')) imgsSupabase++
      else if (url.includes('wixstatic')) imgsWix++
    }
    for (const url of p.videos ?? []) {
      if (url.includes('supabase.co')) vidsSupabase++
      else if (url.includes('wixstatic')) vidsWix++
    }
  }

  console.log('── URLs en productos ──')
  console.log(`  Imágenes Supabase: ${imgsSupabase}`)
  console.log(`  Imágenes Wix:      ${imgsWix}`)
  console.log(`  Videos Supabase:   ${vidsSupabase}`)
  console.log(`  Videos Wix:        ${vidsWix}`)
  console.log(`  Total productos:   ${products?.length ?? 0}\n`)

  // ── Videos del home ──
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['home_video_480', 'home_video_1080', 'home_showcase_video'])

  console.log('── Videos del home (site_settings) ──')
  for (const row of settings ?? []) {
    const host = row.value?.includes('supabase.co')
      ? '⚠️  SUPABASE (egress alto)'
      : row.value?.includes('wixstatic')
        ? '✅ Wix CDN'
        : '❓ otro'
    console.log(`  ${row.key}: ${host}`)
    console.log(`    ${(row.value ?? '').slice(0, 100)}...`)
  }
  if (!settings?.length) console.log('  (sin overrides — defaults Wix en código)\n')
  else console.log()

  // ── Storage por carpeta ──
  console.log('── Storage bucket "images" ──')
  let totalBytes = 0
  let totalFiles = 0

  for (const folder of STORAGE_FOLDERS) {
    const stats = await folderStats(folder)
    totalBytes += stats.bytes
    totalFiles += stats.files
    const flag = folder === 'wix-library' && stats.files > 0 ? ' ⚠️  no usado en storefront' : ''
    console.log(`  ${folder}: ${stats.files} archivos, ${formatBytes(stats.bytes)}${flag}`)
    if (stats.error) console.log(`    error: ${stats.error}`)
    for (const t of stats.topFiles) console.log(`    · ${t}`)
  }

  console.log(`\n  TOTAL: ${totalFiles} archivos, ${formatBytes(totalBytes)}`)

  // ── Referencias a wix-library en DB ──
  const { data: allRows } = await supabase
    .from('products')
    .select('id, name, images, videos, description')

  let wixLibRefs = 0
  for (const row of allRows ?? []) {
    const blob = JSON.stringify([row.images, row.videos, row.description])
    if (blob.includes('wix-library')) wixLibRefs++
  }

  console.log('\n── wix-library ──')
  console.log(`  Referencias en DB: ${wixLibRefs}`)
  console.log(
    wixLibRefs === 0
      ? '  → Seguro eliminar con: npm run audit:wix-library -- --delete'
      : '  → Revisar productos antes de borrar',
  )

  console.log('\n✅ Diagnóstico completo')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
