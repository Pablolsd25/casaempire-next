import { createPublicClient } from '@/lib/supabase/server'
import { getProductIdsInCategory } from '@/lib/product-categories'
import { PRODUCT_LIST_SELECT, CATEGORY_WITH_PRODUCT_COUNTS, getCategoryProductCount, asProductListItems } from '@/lib/supabase/product-selects'
import ProductGrid from '@/components/products/ProductGrid'
import FilterSelect from '@/components/products/FilterSelect'
import PageHero from '@/components/layout/PageHero'
import type { Category } from '@/types'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = { title: 'Tienda' }

interface SearchParams { categoria?: string; orden?: string }

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = createPublicClient()

  // Fetch categories with product count — only show those with products
  const { data: rawCats } = await supabase
    .from('categories')
    .select(CATEGORY_WITH_PRODUCT_COUNTS)
    .order('name')

  const cats = (rawCats ?? [])
    .filter((c) => getCategoryProductCount(c) > 0) as Category[]

  let query = supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('is_active', true)

  if (params.categoria) {
    const cat = cats.find((c) => c.slug === params.categoria)
    if (cat) {
      const ids = await getProductIdsInCategory(supabase, cat.id)
      if (ids.length > 0) query = query.in('id', ids)
      else query = query.eq('category_id', cat.id)
    }
  }

  if (params.orden === 'precio-asc') query = query.order('price', { ascending: true })
  else if (params.orden === 'precio-desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data: products } = await query
  const prods = asProductListItems(products)

  return (
    <div>
      {/* Page header */}
      <PageHero
        title="Tienda"
        subtitle="Todos nuestros suplementos y nutrición deportiva"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <a
            href="/tienda"
            className={`px-4 py-1.5 rounded-sm text-xs font-display uppercase tracking-widest transition-all duration-200
              ${!params.categoria
                ? 'bg-accent text-black font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white'}`}
          >
            Todos
          </a>
          {cats.map((cat) => (
            <a
              key={cat.id}
              href={`/tienda?categoria=${cat.slug}`}
              className={`px-4 py-1.5 rounded-sm text-xs font-display uppercase tracking-widest transition-all duration-200
                ${params.categoria === cat.slug
                  ? 'bg-accent text-black font-bold'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white'}`}
            >
              {cat.name}
            </a>
          ))}

          <div className="ml-auto">
            <FilterSelect currentOrden={params.orden} currentCategoria={params.categoria} />
          </div>
        </div>

        <p className="text-zinc-600 text-xs font-display uppercase tracking-wider mb-6">
          {prods.length} {prods.length === 1 ? 'producto' : 'productos'} encontrados
        </p>

        <ProductGrid products={prods} />
      </div>
    </div>
  )
}
