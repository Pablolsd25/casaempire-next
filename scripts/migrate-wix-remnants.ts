// ============================================================
// migrate-wix-remnants.ts
// Migra lo que aún apunta a Wix: videos hero home, poster, imágenes /envios
//
// Uso: npm run migrate:wix-remnants
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import sharp from 'sharp'

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
const DRY_RUN = process.argv.includes('--dry-run')

const WIX_HERO_1080 =
  'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/1080p/mp4/file.mp4'
const WIX_HERO_480 =
  'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/480p/mp4/file.mp4'
const WIX_HERO_POSTER =
  'https://static.wixstatic.com/media/d60565_a92a4ba089fb4a6d8e4893b90cef9183f001.jpg/v1/fill/w_1920,h_419,al_c,q_85/d60565_a92a4ba089fb4a6d8e4893b90cef9183f001.jpg'
const WIX_SHOWCASE_FALLBACK =
  'https://video.wixstatic.com/video/5cd3e7_a1bdec1e652044e2bae0b70b3d022289/720p/mp4/file.mp4'

const ENVIOS_WIX = [
  'https://static.wixstatic.com/media/5cd3e7_66524d5e7d004d2397225ebb700d3474~mv2.jpeg',
  'https://static.wixstatic.com/media/5cd3e7_b13505cc72964d4893ed97fa2211ca30~mv2.jpeg',
  'https://static.wixstatic.com/media/5cd3e7_52c63226cc7c46aba01a91f09cc4ef7b~mv2.jpeg',
  'https://static.wixstatic.com/media/5cd3e7_1bd8f4706e7d49a795175ad29d93874a~mv2.jpeg',
]

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables Supabase en .env.local')
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

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(300_000) })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function compressVideo(inputPath: string, outputPath: string, maxWidth: number): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-vf', `scale='min(${maxWidth},iw)':-2`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '30',
    '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k',
    '-y', outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 })
}

async function uploadBuffer(
  buffer: Buffer,
  storagePath: string,
  contentType: string,
): Promise<string | null> {
  if (DRY_RUN) {
    console.log(`  [dry-run] subiría ${storagePath} (${formatBytes(buffer.length)})`)
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
  }
  const { data, error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  })
  if (error) {
    console.warn(`  ⚠️  ${storagePath}: ${error.message}`)
    return null
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return pub.publicUrl
}

async function upsertSetting(key: string, value: string) {
  if (DRY_RUN) {
    console.log(`  [dry-run] site_settings.${key}`)
    return
  }
  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
  if (error) console.warn(`  ⚠️  setting ${key}: ${error.message}`)
}

async function migrateHeroVideos(): Promise<{ v480: string; v1080: string } | null> {
  console.log('\n── Videos hero home ──')
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-hero-'))
  try {
    console.log('  Descargando 1080p source...')
    const raw1080 = await download(WIX_HERO_1080)
    if (!raw1080) {
      console.warn('  ⚠️  No se descargó hero 1080 — intentando 480p')
      const raw480only = await download(WIX_HERO_480)
      if (!raw480only) return null
      fs.writeFileSync(path.join(tmpDir, 'raw.mp4'), raw480only)
    } else {
      fs.writeFileSync(path.join(tmpDir, 'raw.mp4'), raw1080)
    }

    const out1080 = path.join(tmpDir, 'hero-1080.mp4')
    const out480 = path.join(tmpDir, 'hero-480.mp4')

    console.log('  Comprimiendo 1080p (max 1280)...')
    await compressVideo(path.join(tmpDir, 'raw.mp4'), out1080, 1280)
    console.log('  Comprimiendo 480p...')
    await compressVideo(path.join(tmpDir, 'raw.mp4'), out480, 480)

    const buf1080 = fs.readFileSync(out1080)
    const buf480 = fs.readFileSync(out480)
    console.log(`  1080: ${formatBytes(buf1080.length)}, 480: ${formatBytes(buf480.length)}`)

    const url1080 = await uploadBuffer(buf1080, 'videos/home-hero-1080.mp4', 'video/mp4')
    const url480 = await uploadBuffer(buf480, 'videos/home-hero-480.mp4', 'video/mp4')

    if (!url1080 || !url480) return null

    await upsertSetting('home_video_1080', url1080)
    await upsertSetting('home_video_480', url480)

    console.log(`  ✅ 1080: ${url1080}`)
    console.log(`  ✅ 480:  ${url480}`)
    return { v480: url480, v1080: url1080 }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function migratePoster(): Promise<string | null> {
  console.log('\n── Poster hero ──')
  const raw = await download(WIX_HERO_POSTER)
  if (!raw) {
    console.warn('  ⚠️  No se descargó poster')
    return null
  }
  const compressed = await sharp(raw)
    .rotate()
    .resize(1920, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  const url = await uploadBuffer(compressed, 'videos/home-hero-poster.jpg', 'image/jpeg')
  if (url) {
    await upsertSetting('home_video_poster', url)
    console.log(`  ✅ ${url}`)
  }
  return url
}

async function migrateShowcaseFallback(): Promise<string | null> {
  console.log('\n── Showcase fallback (por si falta site_settings) ──')
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'home_showcase_video')
    .maybeSingle()

  if (data?.value && !data.value.includes('wixstatic')) {
    console.log('  Ya en Supabase — skip')
    return data.value
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-showcase-'))
  try {
    const raw = await download(WIX_SHOWCASE_FALLBACK)
    if (!raw) return null
    const rawPath = path.join(tmpDir, 'raw.mp4')
    const outPath = path.join(tmpDir, 'out.mp4')
    fs.writeFileSync(rawPath, raw)
    await compressVideo(rawPath, outPath, 720)
    const url = await uploadBuffer(fs.readFileSync(outPath), 'videos/home-showcase.mp4', 'video/mp4')
    if (url) {
      await upsertSetting('home_showcase_video', url)
      console.log(`  ✅ ${url}`)
    }
    return url
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function migrateEnviosImages(): Promise<string[]> {
  console.log('\n── Imágenes página /envios → public/envios/ ──')
  const outDir = path.resolve(process.cwd(), 'public/envios')
  fs.mkdirSync(outDir, { recursive: true })
  const localPaths: string[] = []

  for (let i = 0; i < ENVIOS_WIX.length; i++) {
    const url = ENVIOS_WIX[i]
    const fileName = `proof-${i + 1}.jpg`
    const outPath = path.join(outDir, fileName)

    if (DRY_RUN) {
      console.log(`  [dry-run] ${fileName} ← ${url.slice(0, 60)}...`)
      localPaths.push(`/envios/${fileName}`)
      continue
    }

    const raw = await download(url)
    if (!raw) {
      console.warn(`  ⚠️  falló ${fileName}`)
      continue
    }
    const buf = await sharp(raw).rotate().resize(1200, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    fs.writeFileSync(outPath, buf)
    console.log(`  ✅ ${fileName} (${formatBytes(buf.length)})`)
    localPaths.push(`/envios/${fileName}`)
  }

  return localPaths
}

async function main() {
  console.log(`🚚 Migración restos Wix${DRY_RUN ? ' (dry-run)' : ''}`)

  const hero = await migrateHeroVideos()
  const poster = await migratePoster()
  await migrateShowcaseFallback()
  const envios = await migrateEnviosImages()

  console.log('\n── Resumen URLs para home-video.ts ──')
  if (hero) {
    console.log(`DEFAULT_HOME_VIDEO_480 = '${hero.v480}'`)
    console.log(`DEFAULT_HOME_VIDEO_1080 = '${hero.v1080}'`)
  }
  if (poster) console.log(`DEFAULT_HOME_VIDEO_POSTER = '${poster}'`)

  console.log('\n── Envios local paths ──')
  envios.forEach((p) => console.log(`  ${p}`))

  console.log('\n✅ Listo — actualiza home-video.ts y envios/page.tsx')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
