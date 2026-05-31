// ============================================================
// import-wix-media.ts
// Importa TODA la biblioteca de medios (imágenes + videos) de
// Wix Media Manager a Supabase Storage (bucket `images`,
// carpeta `wix-library/`).
//
// Uso:
//   npm run import:media            # importa todo
//   npm run import:media -- --dry-run   # solo lista, no sube
//
// Variables necesarias en .env.local:
//   WIX_API_KEY=...                 # con permiso "Wix Media Manager"
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

const DRY_RUN = process.argv.includes('--dry-run')

if (!WIX_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisa .env.local')
  console.error('   Necesitas: WIX_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BUCKET = 'images'
const FOLDER = 'wix-library'
const WIX_BASE = 'https://www.wixapis.com'

const wixHeaders = {
  'Authorization': WIX_API_KEY,
  'wix-site-id':   WIX_SITE_ID,
  'Content-Type':  'application/json',
}

// Manifiesto local para dedup entre corridas (wixFileId → ruta en Storage)
const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts', '.wix-media-manifest.json')
function loadManifest(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) } catch { return {} }
}
function saveManifest(m: Record<string, string>) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2))
}

// ─── Tipos (parciales) de Wix Media Manager ─────────────────
interface WixFile {
  id?:          string
  displayName?: string
  url?:         string
  sizeInBytes?: string | number
  mediaType?:   string  // IMAGE | VIDEO | AUDIO | DOCUMENT | VECTOR | ...
  mimeType?:    string
  media?: {
    image?: { image?: { url?: string } }
    video?: { resolutions?: Array<{ url?: string; quality?: string; format?: string }> }
  }
}

// ─── Helpers ────────────────────────────────────────────────
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/ogg': 'ogv',
}

function inferExt(file: WixFile, url: string): string {
  if (file.mimeType && EXT_BY_MIME[file.mimeType]) return EXT_BY_MIME[file.mimeType]
  const clean = url.split('?')[0]
  const m = clean.match(/\.([a-z0-9]{2,5})$/i)
  if (m) return m[1].toLowerCase()
  return file.mediaType === 'VIDEO' ? 'mp4' : 'jpg'
}

function contentTypeFor(ext: string): string {
  const found = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)
  return found ? found[0] : 'application/octet-stream'
}

/** Resuelve la mejor URL descargable para un archivo de Wix. */
async function resolveDownloadUrl(file: WixFile): Promise<string | null> {
  if (file.url && /^https?:\/\//.test(file.url)) return file.url

  // Imagen embebida
  const imgUrl = file.media?.image?.image?.url
  if (imgUrl && /^https?:\/\//.test(imgUrl)) return imgUrl

  // Video: elegir la mejor resolución embebida
  const resos = file.media?.video?.resolutions ?? []
  const order: Record<string, number> = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 }
  const best = [...resos].filter(r => r.url)
    .sort((a, b) => (order[b.quality ?? ''] ?? 0) - (order[a.quality ?? ''] ?? 0))[0]
  if (best?.url) return best.url

  // Fallback: generate-download-url (sobre todo para videos)
  if (file.id) {
    try {
      const res = await fetch(`${WIX_BASE}/site-media/v1/files/generate-download-url`, {
        method: 'POST',
        headers: wixHeaders,
        body: JSON.stringify({ fileId: file.id }),
      })
      if (res.ok) {
        const data: any = await res.json()
        const url = data?.downloadUrls?.[0]?.url ?? data?.downloadUrl ?? null
        if (url) return url
      }
    } catch { /* ignore */ }
  }
  return null
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

/** Pagina la lista de archivos del Media Manager. */
async function listAllFiles(): Promise<WixFile[]> {
  const all: WixFile[] = []
  let cursor: string | null = null
  const limit = 100

  for (let page = 0; page < 200; page++) {
    const params = new URLSearchParams()
    params.set('paging.limit', String(limit))
    if (cursor) params.set('paging.cursor', cursor)

    const res = await fetch(`${WIX_BASE}/site-media/v1/files?${params.toString()}`, {
      method: 'GET',
      headers: wixHeaders,
    })

    if (res.status === 403) {
      console.error('\n❌ 403 — La API key de Wix no tiene permiso "Wix Media Manager".')
      console.error('   Ve a Wix → Settings → API Keys, edita la key y habilita el permiso')
      console.error('   "Wix Media Manager" (lectura). Luego vuelve a correr el script.\n')
      process.exit(1)
    }
    if (!res.ok) {
      console.error(`❌ Error al listar archivos (HTTP ${res.status}):`, await res.text())
      break
    }

    const data: any = await res.json()
    const files: WixFile[] = data.files ?? []
    all.push(...files)
    console.log(`  Página ${page + 1}: +${files.length} (total ${all.length})`)

    const next: string | null =
      data?.pagingMetadata?.cursors?.next ??
      data?.pagingMetadataV2?.cursors?.next ??
      data?.nextCursor ?? null

    if (!next || files.length === 0) break
    cursor = next
  }

  return all
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('🚀 Importando biblioteca de medios de Wix → Supabase')
  console.log(`   Site ID: ${WIX_SITE_ID}`)
  console.log(`   Destino: ${BUCKET}/${FOLDER}/`)
  if (DRY_RUN) console.log('   (modo dry-run: no se sube nada)\n')
  else console.log('')

  const files = await listAllFiles()
  const importable = files.filter(f => f.mediaType === 'IMAGE' || f.mediaType === 'VIDEO')
  console.log(`\n  Encontrados: ${files.length} archivos (${importable.length} imágenes/videos)\n`)

  const manifest = loadManifest()
  let uploaded = 0, skipped = 0, failed = 0

  for (const file of importable) {
    const id = file.id ?? ''
    const label = file.displayName ?? id
    if (!id) { failed++; continue }

    if (manifest[id]) { skipped++; continue }

    const url = await resolveDownloadUrl(file)
    if (!url) {
      console.warn(`  ⚠️  Sin URL descargable: ${label}`)
      failed++
      continue
    }

    const ext = inferExt(file, url)
    const storagePath = `${FOLDER}/${id}.${ext}`

    if (DRY_RUN) {
      console.log(`  · [${file.mediaType}] ${label} → ${storagePath}`)
      uploaded++
      continue
    }

    const buffer = await download(url)
    if (!buffer) {
      console.warn(`  ⚠️  No se pudo descargar: ${label}`)
      failed++
      continue
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: contentTypeFor(ext), upsert: true })

    if (error) {
      console.warn(`  ⚠️  Error subiendo ${label}:`, error.message)
      failed++
      continue
    }

    manifest[id] = storagePath
    saveManifest(manifest)
    uploaded++
    console.log(`  ✅ [${uploaded}] ${file.mediaType} · ${label}`)
  }

  console.log('\n────────────────────────────────────')
  console.log(`  Subidos:  ${uploaded}`)
  console.log(`  Omitidos: ${skipped} (ya importados)`)
  console.log(`  Fallidos: ${failed}`)
  console.log('🎉 Importación completada')
  if (!DRY_RUN) console.log(`   Revísalos en /admin/media (carpeta ${FOLDER})`)
}

main().catch((err) => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
