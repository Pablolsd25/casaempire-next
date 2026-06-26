// Verifica URLs R2 usadas en storefront (productos, categorías, home)
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function checkUrl(label: string, url: string): Promise<boolean> {
  if (!url?.startsWith('http')) {
    console.log(`  ⚠️  ${label}: sin URL`)
    return false
  }
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const ok = res.ok
    const host = new URL(url).hostname
    console.log(`  ${ok ? '✅' : '❌'} ${label} [${host}] ${res.status}`)
    return ok
  } catch (e) {
    console.log(`  ❌ ${label}: ${e instanceof Error ? e.message : e}`)
    return false
  }
}

async function main() {
  console.log('🌐 Revisión storefront — media R2\n')

  const { data: products } = await supabase
    .from('products')
    .select('slug, name, images, videos')
    .limit(5)

  console.log('── Tienda (muestra 3 productos activos) ──')
  let ok = 0
  let total = 0
  for (const p of products ?? []) {
    console.log(`\n  ${p.name} (/producto/${p.slug})`)
    for (const [i, img] of (p.images ?? []).slice(0, 2).entries()) {
      total++
      if (await checkUrl(`imagen ${i + 1}`, img)) ok++
    }
    for (const [i, vid] of (p.videos ?? []).slice(0, 1).entries()) {
      total++
      if (await checkUrl(`video ${i + 1}`, vid)) ok++
    }
  }

  const { data: cats } = await supabase
    .from('categories')
    .select('name, slug, image_url')
    .not('image_url', 'is', null)
    .limit(4)

  console.log('\n── Categorías ──')
  for (const c of cats ?? []) {
    total++
    console.log(`\n  ${c.name}`)
    if (await checkUrl('imagen', c.image_url)) ok++
  }

  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['home_video_480', 'home_video_1080', 'home_video_poster', 'home_showcase_video'])

  console.log('\n── Home (videos) ──')
  for (const s of settings ?? []) {
    total++
    if (await checkUrl(s.key, s.value as string)) ok++
  }

  console.log(`\n── Resumen ──`)
  console.log(`  ${ok}/${total} URLs responden OK`)
  if (ok === total) console.log('  ✅ Todo el media revisado carga desde R2')
  else console.log('  ⚠️  Hay URLs rotas — revisar arriba')
}

main().catch((e) => {
  console.error('❌', e.message ?? e)
  process.exit(1)
})
