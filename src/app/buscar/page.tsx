import { createClient } from '@/lib/supabase/server'
import { buildIlikeOrFilter } from '@/lib/postgrest-sanitize'
import ProductGrid from '@/components/products/ProductGrid'
import type { Product } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Búsqueda' }

interface SearchParams { q?: string }

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const supabase = await createClient()

  let products: Product[] = []

  if (q.length >= 2) {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .or(buildIlikeOrFilter(['name', 'description'], q))
      .order('created_at', { ascending: false })

    products = (data ?? []) as Product[]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Barra de búsqueda */}
      <form method="get" action="/buscar" className="mb-8">
        <div className="flex gap-3 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar productos..."
            className="flex-1 bg-zinc-900 text-white rounded-xl px-5 py-3 border border-zinc-700
              focus:outline-none focus:border-zinc-500 text-sm"
            autoFocus
          />
          <button
            type="submit"
            className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-colors text-sm"
          >
            Buscar
          </button>
        </div>
      </form>

      {q && (
        <p className="text-zinc-500 text-sm mb-6">
          {products.length} resultado{products.length !== 1 ? 's' : ''} para &quot;{q}&quot;
        </p>
      )}

      {q ? (
        <ProductGrid products={products} />
      ) : (
        <p className="text-zinc-500 text-center py-16">Escribe al menos 2 caracteres para buscar.</p>
      )}
    </div>
  )
}
