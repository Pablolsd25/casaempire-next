// ============================================================
// migrate-wix-videos.ts
// Migra videos de productos desde Wix CDN → Supabase Storage,
// comprimiendo a 720p H.264 para web.
//
// Uso:
//   npm run migrate:videos:dry
//   npm run migrate:videos
//   npm run migrate:videos -- --slug=super-peach   # un solo producto
//
// Requisitos: ffmpeg en PATH, .env.local con Supabase service role
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = 'images'
const FOLDER = 'videos'
const DRY_RUN = process.argv.includes('--dry-run')
const SLUG_FILTER = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]

const WIX_HOSTS = ['video.wixstatic.com', 'wixstatic.com']

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

function isWixVideo(url: string): boolean {
  return WIX_HOSTS.some((h) => url.includes(h)) && url.includes('/video/')
}

function isSupabaseVideo(url: string): boolean {
  return url.includes('supabase.co/storage') && url.includes(`/${FOLDER}/`)
}

function wixMediaId(url: string): string | null {
  const m = url.match(/\/video\/([^/]+)\//)
  return m?.[1] ?? null
}

/** Prefiere 720p para descarga más rápida; ffmpeg recomprime igual */
function wixDownloadUrl(url: string): string {
  return url.replace(/\/1080p\//, '/720p/').replace(/\/480p\//, '/720p/')
}

function storageFileName(mediaId: string): string {
  const safe = mediaId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${safe}.mp4`
}

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version'])
    return true
  } catch {
    return false
  }
}

async function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-vf', "scale='min(720,iw)':-2",
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '30',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-y',
    outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 })
}

async function downloadVideo(url: string): Promise<Buffer | null> {
  const tryUrls = [wixDownloadUrl(url), url]
  for (const u of tryUrls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(300_000) })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > 0) return buf
    } catch {
      /* siguiente URL */
    }
  }
  return null
}

async function uploadVideo(buffer: Buffer, fileName: string): Promise<string | null> {
  const filePath = `${FOLDER}/${fileName}`
  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) {
    console.warn(`    ⚠️  Upload fallido: ${error.message}`)
    return null
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return pub.publicUrl
}

async function migrateOneWixUrl(
  wixUrl: string,
  cache: Map<string, string>,
): Promise<string | null> {
  if (cache.has(wixUrl)) return cache.get(wixUrl)!

  const mediaId = wixMediaId(wixUrl)
  if (!mediaId) {
    console.warn(`    ⚠️  URL Wix no reconocida: ${wixUrl}`)
    return null
  }

  const fileName = storageFileName(mediaId)

  if (DRY_RUN) {
    console.log(`  [dry-run] ${mediaId} ← ${wixUrl.slice(0, 80)}...`)
    cache.set(wixUrl, `(dry-run) ${FOLDER}/${fileName}`)
    return cache.get(wixUrl)!
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-wix-vid-'))
  const rawPath = path.join(tmpDir, 'raw.mp4')
  const outPath = path.join(tmpDir, 'out.mp4')

  try {
    console.log(`  ⬇️  Descargando ${mediaId}...`)
    const raw = await downloadVideo(wixUrl)
    if (!raw) {
      console.warn(`    ⚠️  No se pudo descargar`)
      return null
    }
    console.log(`    ${formatBytes(raw.length)} descargados`)

    fs.writeFileSync(rawPath, raw)

    console.log(`  🗜️  Comprimiendo...`)
    await compressVideo(rawPath, outPath)
    const compressed = fs.readFileSync(outPath)
    console.log(`    ${formatBytes(raw.length)} → ${formatBytes(compressed.length)}`)

    console.log(`  ⬆️  Subiendo ${fileName}...`)
    const publicUrl = await uploadVideo(compressed, fileName)
    if (publicUrl) {
      console.log(`    ✅ ${publicUrl}`)
      cache.set(wixUrl, publicUrl)
      return publicUrl
    }
    return null
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  console.log(`🎬 Migración videos Wix → Supabase${DRY_RUN ? ' (dry-run)' : ''}\n`)

  if (!DRY_RUN && !(await ffmpegAvailable())) {
    console.error('❌ ffmpeg no encontrado. Instala: brew install ffmpeg')
    process.exit(1)
  }

  let query = supabase.from('products').select('id, slug, name, videos')
  if (SLUG_FILTER) query = query.eq('slug', SLUG_FILTER)

  const { data: products, error } = await query
  if (error) {
    console.error('❌ Error leyendo productos:', error.message)
    process.exit(1)
  }

  const urlCache = new Map<string, string>()
  let totalWix = 0
  let migrated = 0
  let failed = 0
  let updatedProducts = 0

  // URLs únicas Wix
  const uniqueWix = new Set<string>()
  for (const p of products ?? []) {
    for (const url of p.videos ?? []) {
      if (isWixVideo(url)) uniqueWix.add(url)
    }
  }

  console.log(`  Productos: ${products?.length ?? 0}`)
  console.log(`  Videos Wix únicos: ${uniqueWix.size}\n`)

  if (uniqueWix.size === 0) {
    console.log('✅ No hay videos Wix pendientes.')
    return
  }

  for (const wixUrl of uniqueWix) {
    totalWix++
    const result = await migrateOneWixUrl(wixUrl, urlCache)
    if (result) migrated++
    else failed++
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] Se migrarían ${uniqueWix.size} videos únicos`)
    return
  }

  // Actualizar cada producto
  console.log('\n── Actualizando productos en DB ──')
  for (const p of products ?? []) {
    const videos: string[] = p.videos ?? []
    if (!videos.some(isWixVideo)) continue

    const newVideos = videos.map((url) => {
      if (isSupabaseVideo(url)) return url
      if (isWixVideo(url)) return urlCache.get(url) ?? url
      return url
    })

    const changed = newVideos.some((u, i) => u !== videos[i])
    if (!changed) continue

    const { error: updErr } = await supabase
      .from('products')
      .update({ videos: newVideos })
      .eq('id', p.id)

    if (updErr) {
      console.warn(`  ⚠️  ${p.slug}: ${updErr.message}`)
    } else {
      console.log(`  ✅ ${p.name} (${p.slug})`)
      updatedProducts++
    }
  }

  console.log('\n🎉 Resultado:')
  console.log(`   Videos Wix únicos   : ${totalWix}`)
  console.log(`   Migrados OK         : ${migrated}`)
  console.log(`   Fallidos            : ${failed}`)
  console.log(`   Productos actualizados: ${updatedProducts}`)
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
