import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'
import DeleteProductButton from './DeleteProductButton'

export const metadata = { title: 'Productos | Admin' }

export default async function AdminProductos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>
}) {
  const { q, cat, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const PAGE_SIZE = 20
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Auth check
  const auth = await createClient()
  await auth.auth.getUser()

  // Datos con service role — ve TODOS los productos incluyendo inactivos
  const supabase = createAdminClient()

  let query = supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, stock, is_active, images, category:categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) query = query.ilike('name', `%${q}%`)
  if (cat) query = query.eq('category_id', cat)

  const { data: products, count } = await query
  const { data: categories } = await supabase.from('categories').select('id, name').order('name')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Productos</h1>
          <p className="text-zinc-500 text-sm mt-1">{count ?? 0} productos en total</p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn-accent px-5 py-2.5 rounded text-sm">
          + Nuevo producto
        </Link>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre..."
          className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-accent flex-1 min-w-[200px]"
        />
        <select
          name="cat"
          defaultValue={cat}
          className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-accent"
        >
          <option value="">Todas las categorías</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-accent px-4 py-2 rounded text-sm">Buscar</button>
        {(q || cat) && (
          <Link href="/admin/productos" className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded transition-colors">
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {(products ?? []).map((p) => {
            const cat = (p.category as unknown) as { name: string } | null
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                {/* Thumbnail */}
                {p.images?.[0] ? (
                  <div className="w-14 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                    <Image src={p.images[0]} alt={p.name} fill className="object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded bg-zinc-800 flex-shrink-0" />
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{p.name}</p>
                  <p className="text-zinc-500 text-xs">{cat?.name ?? '—'} · ${Number(p.price).toLocaleString('es-MX')}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                      Stock: {p.stock}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                      {p.is_active ? 'Activo' : 'Oculto'}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="text-xs text-accent border border-accent/40 px-2.5 py-1 rounded text-center hover:bg-accent/10 transition-colors"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/producto/${p.slug}`}
                    target="_blank"
                    className="text-xs text-zinc-500 border border-zinc-700 px-2.5 py-1 rounded text-center hover:text-white transition-colors"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            )
          })}
          {(products ?? []).length === 0 && (
            <p className="py-12 text-center text-zinc-600 text-sm">No se encontraron productos</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Precio</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(products ?? []).map((p) => {
                const cat = (p.category as unknown) as { name: string } | null
                return (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <div className="w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                            <Image src={p.images[0]} alt={p.name} fill className="object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-800 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-white font-medium truncate max-w-[220px]">{p.name}</p>
                          <p className="text-zinc-600 text-xs">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{cat?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span className="text-white font-medium">${Number(p.price).toLocaleString('es-MX')}</span>
                        {p.compare_at_price && (
                          <span className="text-zinc-600 text-xs line-through block">
                            ${Number(p.compare_at_price).toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-zinc-300'}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {p.is_active ? 'Activo' : 'Oculto'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/producto/${p.slug}`}
                          target="_blank"
                          className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-700"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/admin/productos/${p.id}`}
                          className="text-xs text-accent hover:underline px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                        >
                          Editar
                        </Link>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(products ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/productos?page=${page - 1}${q ? `&q=${q}` : ''}${cat ? `&cat=${cat}` : ''}`}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/productos?page=${page + 1}${q ? `&q=${q}` : ''}${cat ? `&cat=${cat}` : ''}`}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
