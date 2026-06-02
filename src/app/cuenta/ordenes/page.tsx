import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mis pedidos — Empire Nutrition' }

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-400',
  paid: 'bg-green-900 text-green-400',
  shipped: 'bg-blue-900 text-blue-400',
  delivered: 'bg-emerald-900 text-emerald-400',
  cancelled: 'bg-red-900 text-red-400',
}

interface SearchParams {
  new?: string
}

export default async function CuentaOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { new: highlightId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/cuenta/ordenes')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, created_at, tracking_number, customer_email')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  const list = orders ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-white font-black text-3xl mb-3">Mis pedidos</h1>
        <p className="text-zinc-400 text-sm">
          Historial de compras de tu cuenta. No necesitas buscar por correo.
        </p>
      </div>

      {highlightId && (
        <div className="mb-6 bg-green-950/40 border border-green-800 text-green-300 text-sm rounded-xl px-4 py-3 text-center">
          ¡Compra registrada! Tu pedido{' '}
          <span className="font-mono font-bold text-white">
            #{highlightId.slice(0, 8).toUpperCase()}
          </span>{' '}
          aparece abajo.
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-6">Aún no tienes pedidos en esta cuenta.</p>
          <Link
            href="/tienda"
            className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-lg hover:bg-zinc-200 transition-colors text-sm"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((order) => {
            const isNew = highlightId === order.id
            return (
              <Link
                key={order.id}
                href={`/orden/${order.id}${isNew ? '?confirmed=1' : ''}`}
                className={`block bg-zinc-900 border rounded-xl p-5 hover:border-zinc-600 transition-colors group ${
                  isNew ? 'border-green-700 ring-1 ring-green-800/50' : 'border-zinc-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-zinc-400 text-xs mb-1">
                      {new Date(order.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-white font-mono font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    {order.tracking_number && (
                      <p className="text-blue-400 text-xs mt-1 font-mono">
                        Guía: {order.tracking_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        statusColor[order.status] ?? 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {statusLabel[order.status] ?? order.status}
                    </span>
                    <p className="text-white font-bold">${Number(order.total).toFixed(2)} MXN</p>
                    <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-zinc-600 text-xs text-center mt-10">
        ¿Compraste sin iniciar sesión?{' '}
        <Link href="/mis-pedidos" className="text-accent hover:underline">
          Buscar pedido por correo
        </Link>
      </p>
    </div>
  )
}
