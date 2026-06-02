import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import RecentOrderRedirect from '@/components/orders/RecentOrderRedirect'

export const metadata: Metadata = { title: 'Buscar mi pedido — Empire Nutrition' }

const statusLabel: Record<string, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  shipped:   'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const statusColor: Record<string, string> = {
  pending:   'bg-yellow-900 text-yellow-400',
  paid:      'bg-green-900 text-green-400',
  shipped:   'bg-blue-900 text-blue-400',
  delivered: 'bg-emerald-900 text-emerald-400',
  cancelled: 'bg-red-900 text-red-400',
}

interface SearchParams { email?: string; order?: string }

export default async function MisPedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (user) redirect('/cuenta/ordenes')

  const sp    = await searchParams
  const email = sp.email?.trim().toLowerCase()
  const order = sp.order?.trim()

  interface OrderRow {
    id: string; status: string; total: number; created_at: string; tracking_number: string | null
  }
  let orderRow: OrderRow | null = null
  let searched = false
  let notFound = false

  if (email && order) {
    searched = true
    const supabase = createAdminClient()

    // Intentar buscar por wix_order_number primero
    const wixNum = parseInt(order, 10)
    if (!isNaN(wixNum)) {
      const { data } = await supabase
        .from('orders')
        .select('id, status, total, created_at, tracking_number')
        .eq('wix_order_number', wixNum)
        .ilike('customer_email', email)
        .single()
      orderRow = data as OrderRow | null
    }

    // Si no se encontró por wix_order_number, probar con prefijo de UUID
    if (!orderRow) {
      // Buscar órdenes del email que empiecen con ese prefijo
      const prefix = order.replace(/^#/, '').toLowerCase()
      const { data: rows } = await supabase
        .from('orders')
        .select('id, status, total, created_at, tracking_number')
        .ilike('customer_email', email)
        .like('id', `${prefix}%`)
        .limit(2)

      if (rows && rows.length === 1) {
        orderRow = rows[0] as OrderRow
      }
    }

    notFound = !orderRow
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <RecentOrderRedirect />
      <div className="text-center mb-10">
        <h1 className="text-white font-black text-3xl mb-3">Buscar mi pedido</h1>
        <p className="text-zinc-400 text-sm">
          Si acabas de comprar, te llevamos automáticamente a tu pedido. Si no, ingresa correo y número
          de orden.
        </p>
      </div>

      {/* ── Formulario de búsqueda ─────────────────────────────────────────── */}
      <form method="GET" action="/mis-pedidos" className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
        <div>
          <label className="block text-zinc-400 text-sm mb-2">Correo electrónico</label>
          <input
            type="email"
            name="email"
            defaultValue={email}
            placeholder="tu@correo.com"
            required
            className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
              focus:outline-none focus:border-zinc-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Número de orden{' '}
            <span className="text-zinc-600 font-normal">(lo recibiste en tu correo de confirmación)</span>
          </label>
          <input
            type="text"
            name="order"
            defaultValue={order}
            placeholder="Ej: 12400 o #4C58A9E8"
            required
            className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
              focus:outline-none focus:border-zinc-500 text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors text-sm"
        >
          Buscar pedido
        </button>
      </form>

      {/* ── Resultados ─────────────────────────────────────────────────────── */}
      {searched && (
        <>
          {notFound ? (
            <div className="text-center py-10">
              <p className="text-zinc-500 mb-4">
                No encontramos un pedido con esos datos.
              </p>
              <p className="text-zinc-600 text-sm mb-6">
                Verifica que el correo y el número de orden sean correctos.
              </p>
              <a
                href="https://wa.me/525571527659"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-sm"
              >
                ¿Necesitas ayuda? Escríbenos por WhatsApp →
              </a>
            </div>
          ) : orderRow ? (
            <div className="space-y-3">
              <p className="text-zinc-500 text-sm mb-4">
                Pedido encontrado para <span className="text-zinc-300">{email}</span>
              </p>
              <Link
                key={orderRow.id}
                href={`/orden/${orderRow.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-zinc-400 text-xs mb-1">
                      {new Date(orderRow.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                    <p className="text-white font-mono font-medium">#{orderRow.id.slice(0, 8).toUpperCase()}</p>
                    {orderRow.tracking_number && (
                      <p className="text-blue-400 text-xs mt-1 font-mono">
                        Guía: {orderRow.tracking_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor[orderRow.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {statusLabel[orderRow.status] ?? orderRow.status}
                    </span>
                    <p className="text-white font-bold">${orderRow.total.toFixed(2)} MXN</p>
                    <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors">→</span>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </>
      )}

      {!searched && (
        <p className="text-zinc-600 text-sm text-center">
          Ingresa tu correo y número de orden para consultar el estado de tu pedido.
        </p>
      )}
    </div>
  )
}
