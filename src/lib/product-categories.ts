import type { SupabaseClient } from '@supabase/supabase-js'
import { isOffersCategory } from '@/lib/offers'
import { PRODUCT_LIST_SELECT } from '@/lib/supabase/product-selects'

export type CategoryRef = { id: string; name?: string | null; slug?: string | null }

/** Categoría principal para tarjetas/breadcrumb — prioriza navegación sobre Ofertas */
export function pickPrimaryCategoryId(
  categoryIds: string[],
  categories: CategoryRef[],
): string | null {
  if (categoryIds.length === 0) return null
  const byId = new Map(categories.map((c) => [c.id, c]))
  const nonOffer = categoryIds.find((id) => {
    const c = byId.get(id)
    return c && !isOffersCategory(c)
  })
  return nonOffer ?? categoryIds[0]
}

export async function getProductIdsInCategory(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string[]> {
  const ids = new Set<string>()

  const { data: links } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', categoryId)

  for (const row of links ?? []) ids.add(row.product_id)

  const { data: legacy } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)

  for (const row of legacy ?? []) ids.add(row.id)

  return [...ids]
}

export async function fetchActiveProductsByCategory(
  supabase: SupabaseClient,
  categoryId: string,
) {
  const ids = await getProductIdsInCategory(supabase, categoryId)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('is_active', true)
    .in('id', ids)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchOfferProducts(
  supabase: SupabaseClient,
  offerCategoryIds: string[],
) {
  const ids = new Set<string>()

  const { data: byFlag } = await supabase
    .from('products')
    .select('id')
    .eq('is_active', true)
    .eq('is_offer', true)

  for (const row of byFlag ?? []) ids.add(row.id)

  for (const catId of offerCategoryIds) {
    const catIds = await getProductIdsInCategory(supabase, catId)
    catIds.forEach((id) => ids.add(id))
  }

  if (ids.size === 0) return []

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('is_active', true)
    .in('id', [...ids])
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function syncProductCategories(
  supabase: SupabaseClient,
  productId: string,
  categoryIds: string[],
  categories: CategoryRef[],
): Promise<{ error?: string }> {
  const unique = [...new Set(categoryIds.filter(Boolean))]
  const primaryId = pickPrimaryCategoryId(unique, categories)

  const { error: delErr } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId)

  if (delErr) return { error: delErr.message }

  if (unique.length > 0) {
    const { error: insErr } = await supabase.from('product_categories').insert(
      unique.map((category_id) => ({ product_id: productId, category_id })),
    )
    if (insErr) return { error: insErr.message }
  }

  const { error: updErr } = await supabase
    .from('products')
    .update({ category_id: primaryId })
    .eq('id', productId)

  if (updErr) return { error: updErr.message }
  return {}
}

export async function loadProductCategoryIds(
  supabase: SupabaseClient,
  productId: string,
  fallbackCategoryId: string | null,
): Promise<string[]> {
  const { data: links } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', productId)

  const ids = links?.map((l) => l.category_id) ?? []
  if (ids.length > 0) return ids
  return fallbackCategoryId ? [fallbackCategoryId] : []
}
