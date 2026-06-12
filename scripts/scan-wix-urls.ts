// Escanea toda la DB buscando URLs de Wix
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

const WIX = /wixstatic|wix\.com/i

function findWix(text: string | null | undefined): string[] {
  if (!text) return []
  const urls = text.match(/https?:\/\/[^\s"'<>]+/g) ?? []
  return urls.filter((u) => WIX.test(u))
}

async function main() {
  console.log('🔍 URLs Wix restantes en DB\n')

  const { data: settings } = await sb.from('site_settings').select('key, value')
  console.log('── site_settings ──')
  for (const row of settings ?? []) {
    const hits = findWix(row.value)
    if (hits.length) {
      console.log(`  ${row.key}:`)
      hits.forEach((u) => console.log(`    ${u}`))
    }
  }
  if (!settings?.some((r) => findWix(r.value).length)) console.log('  (ninguno)')

  const { data: products } = await sb.from('products').select('slug, description, images, videos')
  console.log('\n── products ──')
  let pc = 0
  for (const p of products ?? []) {
    const hits = [
      ...findWix(p.description),
      ...(p.images ?? []).filter((u: string) => WIX.test(u)),
      ...(p.videos ?? []).filter((u: string) => WIX.test(u)),
    ]
    if (hits.length) {
      pc++
      console.log(`  ${p.slug}: ${hits.length} URL(s)`)
      hits.slice(0, 3).forEach((u) => console.log(`    ${u.slice(0, 100)}`))
    }
  }
  if (!pc) console.log('  (ninguno)')

  const { data: cats } = await sb.from('categories').select('slug, image_url, description')
  console.log('\n── categories ──')
  for (const c of cats ?? []) {
    const hits = [...findWix(c.image_url), ...findWix(c.description)]
    if (hits.length) {
      console.log(`  ${c.slug}:`)
      hits.forEach((u) => console.log(`    ${u}`))
    }
  }

  const { data: posts } = await sb.from('blog_posts').select('slug, cover_image, content')
  console.log('\n── blog_posts ──')
  for (const b of posts ?? []) {
    const hits = [...findWix(b.cover_image), ...findWix(b.content)]
    if (hits.length) console.log(`  ${b.slug}: ${hits.length} URL(s)`)
  }

  console.log('\n── defaults en código (home-video.ts) ──')
  console.log('  Verificar que apunten a Supabase (no Wix)')
}

main().catch(console.error)
