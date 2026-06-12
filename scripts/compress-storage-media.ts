// ============================================================
// compress-storage-media.ts
// Recomprime imágenes y videos existentes en Supabase Storage.
// Sobrescribe el mismo path (URLs en DB no cambian).
//
// Uso:
//   npm run compress:media:dry          # simula
//   npm run compress:media              # ejecuta
//   npm run compress:media -- --only=images
//   npm run compress:media -- --only=videos
//
// Requisitos: sharp (npm). Videos: ffmpeg en PATH.
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
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? 'all'

const IMAGE_FOLDERS = ['products', 'products/description', 'categories', 'blog']
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v'])
const MIN_IMAGE_BYTES = 200 * 1024
const MIN_VIDEO_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_WIDTH = 1600
const JPEG_QUALITY = 82

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

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version'])
    return true
  } catch {
    return false
  }
}

async function compressImageBuffer(input: Buffer, ext: string): Promise<{ buffer: Buffer; contentType: string }> {
  let pipeline = sharp(input).rotate().resize(MAX_IMAGE_WIDTH, undefined, {
    withoutEnlargement: true,
  })

  if (ext === 'png') {
    const buffer = await pipeline.png({ quality: 80, compressionLevel: 9 }).toBuffer()
    return { buffer, contentType: 'image/png' }
  }

  const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
  return { buffer, contentType: 'image/jpeg' }
}

async function compressVideoFile(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-i',
    inputPath,
    '-vf',
    "scale='min(720,iw)':-2",
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '30',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-y',
    outputPath,
  ])
}

async function listFiles(folder: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) throw new Error(`${folder}: ${error.message}`)
  return (data ?? []).filter((f) => f.id).map((f) => ({
    name: f.name,
    path: `${folder}/${f.name}`,
    size: (f.metadata?.size as number) ?? 0,
  }))
}

async function processImages() {
  console.log('\n── Imágenes ──')
  let saved = 0
  let processed = 0

  for (const folder of IMAGE_FOLDERS) {
    const files = await listFiles(folder)
    for (const file of files) {
      const ext = extOf(file.name)
      if (!IMAGE_EXT.has(ext)) continue
      if (file.size < MIN_IMAGE_BYTES) {
        console.log(`  skip ${file.path} (${formatBytes(file.size)} — ya liviana)`)
        continue
      }

      processed++
      const { data, error } = await supabase.storage.from(BUCKET).download(file.path)
      if (error || !data) {
        console.warn(`  ⚠️  no descargó ${file.path}: ${error?.message}`)
        continue
      }

      const original = Buffer.from(await data.arrayBuffer())
      const { buffer, contentType } = await compressImageBuffer(original, ext)
      const reduction = file.size - buffer.length

      if (reduction <= 0) {
        console.log(`  skip ${file.path} (comprimida no mejora)`)
        continue
      }

      console.log(
        `  ${DRY_RUN ? '[dry-run] ' : ''}${file.path}: ${formatBytes(file.size)} → ${formatBytes(buffer.length)} (-${formatBytes(reduction)})`,
      )

      if (!DRY_RUN) {
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(file.path, buffer, {
          contentType,
          upsert: true,
        })
        if (upErr) {
          console.warn(`  ⚠️  error subiendo ${file.path}: ${upErr.message}`)
          continue
        }
      }

      saved += reduction
    }
  }

  console.log(`\n  Procesadas: ${processed} | Ahorro: ${formatBytes(saved)}`)
}

async function processVideos(hasFfmpeg: boolean) {
  console.log('\n── Videos ──')
  if (!hasFfmpeg) {
    console.log('  ⚠️  ffmpeg no encontrado — salta videos. Instala: brew install ffmpeg')
    return
  }

  const files = await listFiles('videos')
  let saved = 0

  for (const file of files) {
    const ext = extOf(file.name)
    if (!VIDEO_EXT.has(ext)) continue
    if (file.size < MIN_VIDEO_BYTES) {
      console.log(`  skip ${file.path} (${formatBytes(file.size)} — ya liviano)`)
      continue
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-compress-'))
    const inputPath = path.join(tmpDir, `in.${ext}`)
    const outputPath = path.join(tmpDir, 'out.mp4')

    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(file.path)
      if (error || !data) {
        console.warn(`  ⚠️  no descargó ${file.path}`)
        continue
      }

      fs.writeFileSync(inputPath, Buffer.from(await data.arrayBuffer()))
      await compressVideoFile(inputPath, outputPath)
      const outStat = fs.statSync(outputPath)
      const reduction = file.size - outStat.size

      if (reduction <= 0) {
        console.log(`  skip ${file.path} (comprimido no mejora)`)
        continue
      }

      console.log(
        `  ${DRY_RUN ? '[dry-run] ' : ''}${file.path}: ${formatBytes(file.size)} → ${formatBytes(outStat.size)} (-${formatBytes(reduction)})`,
      )

      if (!DRY_RUN) {
        const outBuffer = fs.readFileSync(outputPath)
        const uploadPath = ext === 'mp4' ? file.path : file.path.replace(/\.[^.]+$/, '.mp4')
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(uploadPath, outBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        })
        if (upErr) {
          console.warn(`  ⚠️  error subiendo ${uploadPath}: ${upErr.message}`)
          continue
        }

        if (uploadPath !== file.path) {
          await supabase.storage.from(BUCKET).remove([file.path])
          await updateVideoUrlInDb(file.path, uploadPath)
        }
      }

      saved += reduction
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }

  console.log(`\n  Ahorro videos: ${formatBytes(saved)}`)
}

async function updateVideoUrlInDb(oldPath: string, newPath: string) {
  const oldFragment = `/images/${oldPath}`
  const newFragment = `/images/${newPath}`

  const { data: settings } = await supabase.from('site_settings').select('key, value')
  for (const row of settings ?? []) {
    if (row.value?.includes(oldFragment)) {
      await supabase
        .from('site_settings')
        .update({ value: row.value.replace(oldFragment, newFragment) })
        .eq('key', row.key)
    }
  }

  const { data: products } = await supabase.from('products').select('id, videos')
  for (const p of products ?? []) {
    const videos: string[] = p.videos ?? []
    if (!videos.some((u) => u.includes(oldFragment))) continue
    const updated = videos.map((u) => (u.includes(oldFragment) ? u.replace(oldFragment, newFragment) : u))
    await supabase.from('products').update({ videos: updated }).eq('id', p.id)
  }
}

async function main() {
  console.log(`🗜️  Compresión Storage${DRY_RUN ? ' (dry-run)' : ''}`)
  console.log(`   Proyecto: ${SUPABASE_URL}`)

  const hasFfmpeg = await ffmpegAvailable()

  if (ONLY === 'all' || ONLY === 'images') await processImages()
  if (ONLY === 'all' || ONLY === 'videos') await processVideos(hasFfmpeg)

  console.log('\n✅ Listo')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
