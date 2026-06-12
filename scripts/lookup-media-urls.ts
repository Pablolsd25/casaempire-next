// Quick lookup: where product/home media URLs are hosted
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return '?'
  }
}

async function main() {
  const slug = process.argv[2] ?? 'super-peach'

  const { data: product } = await sb
    .from('products')
    .select('name, slug, images, videos')
    .eq('slug', slug)
    .maybeSingle()

  console.log(`\n📦 Producto: ${product?.name ?? slug}\n`)

  if (!product) {
    console.log('No encontrado')
    return
  }

  console.log('Imágenes:')
  ;(product.images ?? []).forEach((url: string, i: number) => {
    console.log(`  ${i + 1}. [${hostOf(url)}] ${url}`)
  })

  console.log('\nVideos:')
  const videos = product.videos ?? []
  if (videos.length === 0) console.log('  (ninguno en DB)')
  videos.forEach((url: string, i: number) => {
    console.log(`  ${i + 1}. [${hostOf(url)}] ${url}`)
  })

  const { data: settings } = await sb
    .from('site_settings')
    .select('key, value')
    .in('key', ['home_video_480', 'home_video_1080', 'home_showcase_video'])

  console.log('\n🏠 Videos del home:')
  const defaults = {
    home_video_480: 'Wix (default en código)',
    home_video_1080: 'Wix (default en código)',
    home_showcase_video: 'Wix (default en código)',
  }
  const keys = ['home_video_480', 'home_video_1080', 'home_showcase_video'] as const
  for (const key of keys) {
    const row = settings?.find((s) => s.key === key)
    if (row?.value) {
      console.log(`  ${key}: [${hostOf(row.value)}]`)
      console.log(`    ${row.value}`)
    } else {
      console.log(`  ${key}: ${defaults[key]}`)
    }
  }
}

main().catch(console.error)
