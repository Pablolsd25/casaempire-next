import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata = { title: 'Órdenes | Admin' }

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400',
  paid:      'bg-green-500/20 text-green-400',
  shipped:   'bg-blue-500/20 text-blue-400',
  delivered: 'bg-accent/20 text-accent',
  cancelled: 'bg-red-500/20 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  shipped:   'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default async function AdminOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const PAGE_SIZE = 20
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Auth check
  const auth = await createClient()
  await auth.auth.getUser()

  // Datos con service role — ve TODAS las órdenes
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select('id, status, total, subtotal, shipping_cost, customer_email, created_at, openpay_transaction_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Órdenes</h1>
        <p className="text-zinc-500 text-sm mt-1">{count ?? 0} órdenes en total</p>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: '',          label: 'Todas' },
          { value: 'pending',   label: 'Pendientes' },
          { value: 'paid',      label: 'Pagadas' },
          { value: 'shipped',   label: 'Enviadas' },
          { value: 'delivered', label: 'Entregadas' },
          { value: 'cancelled', label: 'Canceladas' },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/admin/ordenes${opt.value ? `?status=${opt.value}` : ''}`}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${status === opt.value || (!status && !opt.value)
                ? 'bg-accent text-black'
                : 'border border-zinc-700 text-zinc-400 hover:text-white'
              }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {(orders ?? []).map((order) => (
            <Link
              key={order.id}
              href={`/admin/ordenes/${order.id}`}
              className="block px-4 py-3 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-mono text-accent text-xs">#{order.id.slice(0, 8)}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-zinc-300 text-sm truncate">{order.customer_email ?? '—'}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-white font-semibold">${Number(order.total).toLocaleString('es-MX')} MXN</span>
                <span className="text-zinc-500 text-xs">
                  {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
          {(orders ?? []).length === 0 && (
            <p className="py-12 text-center text-zinc-600 text-sm">
              No hay órdenes {status ? `con estado "${STATUS_LABELS[status]}"` : ''}
            </p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(orders ?? []).map((order) => (
                <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/ordenes/${order.id}`} className="text-accent hover:underline font-mono text-xs">
                      #{order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 truncate max-w-[180px]">
                    {order.customer_email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    ${Number(order.total).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(order.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/ordenes/${order.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    No hay órdenes {status ? `con estado "${STATUS_LABELS[status]}"` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/ordenes?page=${page - 1}${status ? `&status=${status}` : ''}`}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/ordenes?page=${page + 1}${status ? `&status=${status}` : ''}`}
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
