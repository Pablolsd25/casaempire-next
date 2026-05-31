/**
 * Fix categories: migrate products from Wix-derived categories
 * to the correct seed categories (hombres / mujeres)
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Cargar .env.local automáticamente
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 1. Get all category IDs by slug
  const { data: allCats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug')

  if (catErr || !allCats) {
    console.error('Error fetching categories:', catErr)
    process.exit(1)
  }

  console.log('All categories:')
  allCats.forEach((c) => console.log(`  ${c.slug} → ${c.id} (${c.name})`))

  const bySlug = (slug: string) => allCats.find((c) => c.slug === slug)

  const hombres   = bySlug('hombres')
  const mujeres   = bySlug('mujeres')
  const menNut    = bySlug('men-nutrition')
  const womenNut  = bySlug('women-s-nutrition')
  const suplem    = bySlug('suplementos')

  if (!hombres || !mujeres) {
    console.error('ERROR: Target categories hombres/mujeres not found in DB')
    process.exit(1)
  }

  // 2. Migrate Men Nutrition → hombres
  if (menNut) {
    const { error, count } = await supabase
      .from('products')
      .update({ category_id: hombres.id })
      .eq('category_id', menNut.id)
    console.log(`Migrated Men Nutrition → hombres (${count} products)`, error ?? '')
  } else {
    console.log('men-nutrition category not found (already migrated?)')
  }

  // 3. Migrate Women's nutrition → mujeres
  if (womenNut) {
    const { error, count } = await supabase
      .from('products')
      .update({ category_id: mujeres.id })
      .eq('category_id', womenNut.id)
    console.log(`Migrated Women's nutrition → mujeres (${count} products)`, error ?? '')
  } else {
    console.log('women-s-nutrition category not found (already migrated?)')
  }

  // 4. Migrate Suplementos → mujeres (BARBIE FIT, SUMMERBODY, SWEET BOO)
  if (suplem) {
    const { error, count } = await supabase
      .from('products')
      .update({ category_id: mujeres.id })
      .eq('category_id', suplem.id)
    console.log(`Migrated Suplementos → mujeres (${count} products)`, error ?? '')
  } else {
    console.log('suplementos category not found (already migrated?)')
  }

  // 5. Delete junk/empty categories (keep: hombres, mujeres, ofertas)
  const keepSlugs = ['hombres', 'mujeres', 'ofertas']
  const toDelete = allCats
    .filter((c) => !keepSlugs.includes(c.slug))
    .map((c) => c.id)

  if (toDelete.length > 0) {
    const { error, count } = await supabase
      .from('categories')
      .delete()
      .in('id', toDelete)
    console.log(`Deleted ${count ?? toDelete.length} junk categories`, error ?? '')
  } else {
    console.log('No junk categories to delete.')
  }

  // 6. Final verification
  const { data: finalCats } = await supabase.from('categories').select('name, slug')
  const { data: prods } = await supabase.from('products').select('name, category_id')

  console.log('\n=== Final categories ===')
  finalCats?.forEach((c) => console.log(`  ${c.slug}: ${c.name}`))

  const hombresCount = prods?.filter((p) => p.category_id === hombres.id).length ?? 0
  const mujeresCount = prods?.filter((p) => p.category_id === mujeres.id).length ?? 0
  console.log(`\nProducts: hombres=${hombresCount}, mujeres=${mujeresCount}`)
}

main().catch(console.error)
