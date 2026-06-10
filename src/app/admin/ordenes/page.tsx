import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import DeleteOrderButton from './DeleteOrderButton'
import OrderItemsExpander from './OrderItemsExpander'
import { formatOrderNumber } from '@/lib/order-number'
import { formatMexicoDate, formatMexicoDateTime } from '@/lib/mexico-datetime'

export const metadata = { title: 'Pedidos | Admin' }

// ─── Status helpers ───────────────────────────────────────────────────────────

function paymentBadge(status: string) {
  switch (status) {
    case 'paid':
    case 'shipped':
    case 'delivered':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">Pagado</span>
    case 'cancelled':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">Cancelado</span>
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Pendiente</span>
  }
}

function fulfillmentBadge(status: string) {
  switch (status) {
    case 'delivered':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">Entregado</span>
    case 'shipped':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">Enviado</span>
    case 'paid':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">Por enviar</span>
    case 'cancelled':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">Cancelado</span>
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400/80 border border-red-500/20">No procesado</span>
  }
}

const FILTER_OPTS = [
  { value: '',          label: 'Todos' },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'paid',      label: 'Pagados' },
  { value: 'shipped',   label: 'Enviados' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
]

export default async function AdminOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const auth = await createClient()
  await auth.auth.getUser()

  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select(
      'id, status, total, customer_email, customer_name, wix_order_number, created_at, order_items(quantity, unit_price, name, product_image)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  let { data: orders, count, error: queryError } = await query

  // Fallback if name/product_image columns haven't been added yet
  if (queryError && queryError.message.includes('column')) {
    const fallback = supabase
      .from('orders')
      .select(
        'id, status, total, customer_email, customer_name, wix_order_number, created_at, order_items(quantity, unit_price)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to)
    if (status) (fallback as typeof fallback).eq('status', status)
    const res = await (status ? fallback.eq('status', status) : fallback)
    orders = res.data as typeof orders
    count = res.count
    queryError = res.error
  }

  if (queryError) console.error('[admin/ordenes] query error:', queryError.message)
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // ── Recent threshold for "NUEVO" badge (48 h) ───────────────────────────────
  const recentCutoff = Date.now() - 48 * 60 * 60 * 1000

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">Pedidos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{count ?? 0} pedidos en total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTS.map((opt) => (
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
          {(orders ?? []).map((order) => {
            const isNew = new Date(order.created_at).getTime() > recentCutoff
            const displayNum = formatOrderNumber(order)
            const displayName = order.customer_name ?? order.customer_email ?? '—'
            const items = (order.order_items as Array<{ quantity: number; unit_price: number; name?: string | null; product_image?: string | null }>) ?? []

            return (
              <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/admin/ordenes/${order.id}`} className="font-mono text-accent text-sm font-semibold hover:underline">
                      {displayNum}
                    </Link>
                    {isNew && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase">
                        Nuevo
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-300 text-sm truncate">{displayName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {paymentBadge(order.status)}
                    {fulfillmentBadge(order.status)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-semibold text-sm">${Number(order.total).toLocaleString('es-MX')} MXN</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {formatMexicoDate(order.created_at)}
                  </p>
                  <div className="flex justify-end mt-0.5">
                    <OrderItemsExpander items={items} />
                  </div>
                </div>
                <DeleteOrderButton orderId={order.id} orderLabel={displayNum} />
              </div>
            )
          })}
          {(orders ?? []).length === 0 && (
            <p className="py-12 text-center text-zinc-600 text-sm">No hay pedidos</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Fecha de creación</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-center px-4 py-3 font-medium">Pago</th>
                <th className="text-center px-4 py-3 font-medium">Cumplimiento</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Ítems</th>
                <th className="text-right px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(orders ?? []).map((order) => {
                const isNew = new Date(order.created_at).getTime() > recentCutoff
                const displayNum = formatOrderNumber(order)
                const displayName = order.customer_name ?? order.customer_email ?? '—'
                const items = (order.order_items as Array<{ quantity: number; unit_price: number; name?: string | null; product_image?: string | null }>) ?? []

                return (
                  <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors group">
                    {/* Pedido */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/ordenes/${order.id}`}
                          className="font-mono text-accent font-semibold hover:underline"
                        >
                          {displayNum}
                        </Link>
                        {isNew && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase">
                            Nuevo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {formatMexicoDateTime(order.created_at)}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 text-zinc-300 max-w-[180px]">
                      <span className="truncate block">{displayName}</span>
                    </td>

                    {/* Pago */}
                    <td className="px-4 py-3 text-center">
                      {paymentBadge(order.status)}
                    </td>

                    {/* Cumplimiento */}
                    <td className="px-4 py-3 text-center">
                      {fulfillmentBadge(order.status)}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right text-white font-medium whitespace-nowrap">
                      ${Number(order.total).toLocaleString('es-MX')} MXN
                    </td>

                    {/* Ítems */}
                    <td className="px-4 py-3 text-center">
                      <OrderItemsExpander items={items} />
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/ordenes/${order.id}`}
                          className="text-xs text-accent hover:underline whitespace-nowrap"
                        >
                          Ver →
                        </Link>
                        <DeleteOrderButton orderId={order.id} orderLabel={displayNum} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-600">
                    No hay pedidos{status ? ` con ese estado` : ''}
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
              Página {page} de {totalPages} · {count} pedidos
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/ordenes?page=${page - 1}${status ? `&status=${status}` : ''}`}
                  className="px-3 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/ordenes?page=${page + 1}${status ? `&status=${status}` : ''}`}
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
