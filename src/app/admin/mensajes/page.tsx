import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MarkReadButton from './MarkReadButton'

export const metadata = { title: 'Mensajes | Admin' }

const PAGE_SIZE = 30

export default async function AdminMensajesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  const { filter, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  const soloNoLeidos = filter === 'unread'

  await (await createClient()).auth.getUser()
  const supabase = createAdminClient()

  let query = supabase
    .from('contact_submissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (soloNoLeidos) query = query.eq('leido', false)

  const { data: msgs, count } = await query
  const { count: unreadCount } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('leido', false)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (soloNoLeidos) params.set('filter', 'unread')
    params.set('page', String(p))
    return `/admin/mensajes?${params.toString()}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Mensajes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {count ?? 0} mensajes · {unreadCount ?? 0} sin leer
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Link
          href="/admin/mensajes"
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
            ${!soloNoLeidos ? 'bg-accent text-black' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}
        >
          Todos
        </Link>
        <Link
          href="/admin/mensajes?filter=unread"
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
            ${soloNoLeidos ? 'bg-accent text-black' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}
        >
          Sin leer {(unreadCount ?? 0) > 0 && `(${unreadCount})`}
        </Link>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {(msgs ?? []).length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-zinc-600">
            No hay mensajes
          </div>
        )}
        {(msgs ?? []).map((m) => (
          <div
            key={m.id}
            className={`bg-zinc-900 border rounded-xl p-5 transition-colors
              ${m.leido ? 'border-zinc-800' : 'border-accent/40 shadow-[0_0_12px_rgba(35,243,14,0.06)]'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Nombre + email */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {!m.leido && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase">
                      Nuevo
                    </span>
                  )}
                  <span className="text-white font-semibold text-sm">
                    {[m.nombre, m.apellido].filter(Boolean).join(' ') || '—'}
                  </span>
                  <a href={`mailto:${m.email}`} className="text-accent text-xs hover:underline">
                    {m.email}
                  </a>
                  {m.whatsapp && (
                    <span className="text-zinc-500 text-xs">{m.whatsapp}</span>
                  )}
                </div>
                {/* Mensaje */}
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed mt-2">
                  {m.mensaje}
                </p>
              </div>
              {/* Acciones */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-zinc-600 text-xs whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
                {!m.leido && <MarkReadButton id={m.id} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-zinc-500 text-xs">Página {page} de {totalPages}</p>
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
  )
}
