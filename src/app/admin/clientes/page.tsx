import { createAdminClient } from '@/lib/supabase/admin'
import { buildIlikeOrFilter } from '@/lib/postgrest-sanitize'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Clientes | Admin' }

const PAGE_SIZE = 50

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Verificar sesión
  const auth = await createClient()
  await auth.auth.getUser()

  const supabase = createAdminClient()

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, labels, subscriber_status, source, wix_created_date', { count: 'exact' })
    .order('wix_created_date', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (q) {
    query = query.or(
      buildIlikeOrFilter(['first_name', 'last_name', 'email', 'phone'], q)
    )
  }

  const { data: contacts, count, error } = await query

  if (error) console.error('[admin/clientes] query error:', error.message)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(p))
    return `/admin/clientes?${params.toString()}`
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{count ?? 0} contactos importados de Wix CRM</p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET" action="/admin/clientes" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, email o teléfono..."
          className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-4 py-2.5
            placeholder-zinc-600 focus:outline-none focus:border-zinc-500 max-w-sm"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
        >
          Buscar
        </button>
        {q && (
          <Link
            href="/admin/clientes"
            className="px-4 py-2.5 border border-zinc-700 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {(contacts ?? []).map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
            return (
              <div key={c.id} className="px-4 py-3 space-y-0.5">
                <p className="text-white text-sm font-medium">{name}</p>
                <p className="text-zinc-400 text-xs">{c.email ?? '—'}</p>
                <p className="text-zinc-500 text-xs">{c.phone ?? '—'}</p>
                {(c.labels ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(c.labels as string[]).slice(0, 3).map((l: string) => (
                      <span key={l} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {(contacts ?? []).length === 0 && (
            <p className="py-12 text-center text-zinc-600 text-sm">
              {q ? 'Sin resultados para esa búsqueda' : 'No hay contactos. Corre npm run migrate:contacts primero.'}
            </p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium">Etiquetas</th>
                <th className="text-left px-4 py-3 font-medium">Fuente</th>
                <th className="text-left px-4 py-3 font-medium">Fecha Wix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(contacts ?? []).map((c) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{name}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {((c.labels ?? []) as string[]).slice(0, 3).map((l: string) => (
                          <span key={l} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{c.source ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {c.wix_created_date
                        ? new Date(c.wix_created_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
              {(contacts ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    {q ? 'Sin resultados para esa búsqueda' : 'No hay contactos. Corre npm run migrate:contacts primero.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs">
              Página {page} de {totalPages} · {count} contactos
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildHref(page - 1)}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref(page + 1)}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                >
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
