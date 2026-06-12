// ============================================================
// audit-wix-library.ts
// Audita y opcionalmente elimina la carpeta wix-library/ del bucket.
// Esa carpeta es basura de import masivo — no se usa en storefront.
//
// Uso:
//   npm run audit:wix-library              # solo lista
//   npm run audit:wix-library -- --delete  # borra archivos (irreversible)
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
const DELETE = process.argv.includes('--delete')
const FOLDER = 'wix-library'
const BUCKET = 'images'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function formatBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

async function main() {
  console.log(`📁 Auditoría: ${BUCKET}/${FOLDER}\n`)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(FOLDER, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    console.error('❌ Error listando carpeta:', error.message)
    process.exit(1)
  }

  const files = (data ?? []).filter((f) => f.id)
  if (files.length === 0) {
    console.log('✅ Carpeta vacía o no existe — nada que limpiar.')
    return
  }

  let totalBytes = 0
  for (const f of files) totalBytes += (f.metadata?.size as number) ?? 0

  console.log(`  Archivos: ${files.length}`)
  console.log(`  Tamaño:   ${formatBytes(totalBytes)}\n`)

  // Verificar referencias en DB
  const { data: products } = await supabase
    .from('products')
    .select('id, name, images, videos, description')

  const refs: string[] = []
  for (const p of products ?? []) {
    const blob = JSON.stringify([p.images, p.videos, p.description])
    if (blob.includes('wix-library')) refs.push(p.name)
  }

  if (refs.length > 0) {
    console.log('⚠️  Productos con referencias a wix-library:')
    refs.forEach((n) => console.log(`  · ${n}`))
    console.log('\n❌ No se puede borrar de forma segura. Actualiza URLs primero.')
    process.exit(1)
  }

  console.log('✅ Sin referencias en DB — seguro eliminar.\n')

  if (!DELETE) {
    console.log('Modo lectura. Para borrar: npm run audit:wix-library -- --delete')
    return
  }

  const paths = files.map((f) => `${FOLDER}/${f.name}`)
  const BATCH = 100

  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    const { error: delErr } = await supabase.storage.from(BUCKET).remove(batch)
    if (delErr) {
      console.error('❌ Error borrando:', delErr.message)
      process.exit(1)
    }
    console.log(`  Borrados ${Math.min(i + BATCH, paths.length)}/${paths.length}`)
  }

  console.log(`\n✅ Eliminados ${paths.length} archivos (${formatBytes(totalBytes)} liberados)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
