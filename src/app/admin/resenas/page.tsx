import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ReviewActions from './ReviewActions'

export const metadata = { title: 'Reseñas | Admin' }

const PAGE_SIZE = 30

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= rating ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.8"
          className={i <= rating ? 'text-yellow-400' : 'text-zinc-600'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

export default async function AdminResenasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  const { filter, page: pageParam } = await searchParams
  const page     = Math.max(1, parseInt(pageParam ?? '1'))
  const from     = (page - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1
  const soloPendientes = filter === 'pending'

  await (await createClient()).auth.getUser()
  const supabase = createAdminClient()

  let query = supabase
    .from('reviews')
    .select('*, product:products(id, name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (soloPendientes) query = query.eq('is_approved', false)

  const { data: reviews, count } = await query
  const { count: pendingCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (soloPendientes) params.set('filter', 'pending')
    params.set('page', String(p))
    return `/admin/resenas?${params.toString()}`
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Reseñas</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {count ?? 0} reseñas · {pendingCount ?? 0} pendientes de aprobación
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Link href="/admin/resenas"
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
            ${!soloPendientes ? 'bg-accent text-black' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}>
          Todas
        </Link>
        <Link href="/admin/resenas?filter=pending"
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
            ${soloPendientes ? 'bg-accent text-black' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}>
          Pendientes {(pendingCount ?? 0) > 0 && `(${pendingCount})`}
        </Link>
      </div>

      {/* Tabla */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 font-medium">Producto</th>
                <th className="text-left px-4 py-3 font-medium">Autor</th>
                <th className="text-left px-4 py-3 font-medium">Reseña</th>
                <th className="text-center px-4 py-3 font-medium">Rating</th>
                <th className="text-center px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(reviews ?? []).map((r) => {
                const product = r.product as { id: string; name: string; slug: string } | null
                return (
                  <tr key={r.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-300 text-xs max-w-[140px]">
                      {product ? (
                        <Link href={`/admin/productos/${product.id}`}
                          className="hover:text-accent transition-colors line-clamp-2">
                          {product.name}
                        </Link>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{r.reviewer_name ?? '—'}</p>
                      {r.reviewer_email && (
                        <p className="text-zinc-500 text-[11px]">{r.reviewer_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {r.title && <p className="text-zinc-300 text-xs font-medium mb-0.5">{r.title}</p>}
                      <p className="text-zinc-500 text-xs line-clamp-2">{r.comment ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Stars rating={r.rating} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_approved
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">Aprobada</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Pendiente</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <ReviewActions id={r.id} isApproved={r.is_approved} />
                    </td>
                  </tr>
                )
              })}
              {(reviews ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-600">
                    {soloPendientes ? 'No hay reseñas pendientes' : 'No hay reseñas. Corre npm run migrate:reviews primero.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-zinc-800">
          {(reviews ?? []).map((r) => {
            const product = r.product as { name: string } | null
            return (
              <div key={r.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} />
                  {r.is_approved
                    ? <span className="text-[10px] text-green-400">Aprobada</span>
                    : <span className="text-[10px] text-yellow-400">Pendiente</span>}
                </div>
                <p className="text-white text-xs font-medium">{r.reviewer_name ?? '—'}</p>
                <p className="text-zinc-500 text-xs">{product?.name ?? '—'}</p>
                <p className="text-zinc-400 text-xs line-clamp-2">{r.comment ?? '—'}</p>
                <ReviewActions id={r.id} isApproved={r.is_approved} />
              </div>
            )
          })}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs">Página {page} de {totalPages} · {count} reseñas</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref(page - 1)}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildHref(page + 1)}
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
