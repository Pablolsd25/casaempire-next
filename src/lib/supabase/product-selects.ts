/** Categoría principal (products.category_id) — explícito por FK tras product_categories */
export const PRODUCT_WITH_CATEGORY =
  '*, category:categories!products_category_id_fkey(*)'

/** Storefront list/grid — sin description, videos, cost ni wix_id */
export const PRODUCT_LIST_SELECT =
  'id, name, slug, price, compare_at_price, is_active, is_offer, manage_stock, stock, sort_order, images, shipping_cost, category:categories!products_category_id_fkey(id, name, slug)'

export const PRODUCT_WITH_CATEGORY_NAME =
  '*, category:categories!products_category_id_fkey(name)'

export const ADMIN_PRODUCT_LIST_SELECT =
  'id, name, slug, price, compare_at_price, is_active, images, category:categories!products_category_id_fkey(name), options:product_options(id, values:product_option_values(id))'

/** Conteos de productos por categoría — FK explícitas tras product_categories */
export const CATEGORY_ADMIN_LIST_SELECT =
  'id, name, slug, image_url, product_categories(count), products:products!products_category_id_fkey(count)'

export const CATEGORY_WITH_PRODUCT_COUNTS =
  '*, product_categories(count), products:products!products_category_id_fkey(count)'

export function getCategoryProductCount(row: {
  product_categories?: Array<{ count: number }>
  products?: Array<{ count: number }>
}): number {
  const junction = row.product_categories?.[0]?.count ?? 0
  const legacy = row.products?.[0]?.count ?? 0
  return Math.max(junction, legacy)
}

/** Normaliza filas de PRODUCT_LIST_SELECT al tipo de tarjeta */
export function asProductListItems(
  rows: unknown[] | null | undefined,
): import('@/types').ProductListItem[] {
  return (rows ?? []) as import('@/types').ProductListItem[]
}
