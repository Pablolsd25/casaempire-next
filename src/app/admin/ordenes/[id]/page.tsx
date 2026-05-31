import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import OrderStatusButton from './OrderStatusButton'
import TrackingInput from './TrackingInput'
import RefundButton from './RefundButton'

export const metadata = { title: 'Detalle de Orden | Admin' }

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  paid:      'bg-green-500/20 text-green-400 border-green-500/30',
  shipped:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivered: 'bg-accent/20 text-accent border-accent/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  shipped:   'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const NEXT_STATUS: Record<string, string[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
}

export default async function OrdenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const auth = await createClient()
  await auth.auth.getUser()

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        id, quantity, unit_price,
        product:products(id, name, slug, images)
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const addr = order.shipping_address as Record<string, string> | null
  const canRefund = ['paid', 'shipped'].includes(order.status) && !!order.openpay_transaction_id

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
            Orden #{order.id.slice(0, 8)}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {new Date(order.created_at).toLocaleString('es-MX')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded border text-sm font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          {/* Botón de reembolso */}
          {canRefund && (
            <RefundButton orderId={order.id} />
          )}
        </div>
      </div>

      {/* Cambiar estado */}
      {(NEXT_STATUS[order.status]?.length ?? 0) > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Cambiar estado</p>
          <div className="flex gap-3 flex-wrap">
            {NEXT_STATUS[order.status].map((s) => (
              <OrderStatusButton key={s} orderId={order.id} newStatus={s} label={STATUS_LABELS[s]} />
            ))}
          </div>
        </div>
      )}

      {/* Número de guía */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wide mb-3">
          Número de guía{' '}
          <span className="normal-case font-normal text-zinc-600">(se mostrará al cliente y se incluirá en el email de envío)</span>
        </p>
        {order.status === 'shipped' || order.status === 'delivered' || order.status === 'paid' ? (
          <TrackingInput orderId={order.id} initialValue={order.tracking_number ?? null} />
        ) : order.tracking_number ? (
          <p className="text-white font-mono text-sm">{order.tracking_number}</p>
        ) : (
          <p className="text-zinc-600 text-sm">Disponible cuando el estado sea Pagado, Enviado o Entregado.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Info cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Cliente</p>
          <p className="text-white text-sm">{order.customer_email ?? '—'}</p>
          {order.openpay_transaction_id && (
            <p className="text-zinc-600 text-xs mt-2 font-mono break-all">
              OpenPay: {order.openpay_transaction_id}
            </p>
          )}
        </div>

        {/* Dirección */}
        {addr && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Dirección de envío</p>
            <p className="text-white text-sm">{addr.street}</p>
            <p className="text-zinc-400 text-sm">{addr.city}, {addr.state} {addr.zip ?? addr.zip_code}</p>
            <p className="text-zinc-400 text-sm">{addr.country}</p>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wide mb-4">Productos</p>
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(order.items ?? []).map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Imagen del producto */}
                {item.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0 object-cover border border-zinc-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-zinc-800 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{item.product?.name ?? 'Producto eliminado'}</p>
                  <p className="text-zinc-600 text-xs">×{item.quantity} · ${Number(item.unit_price).toLocaleString('es-MX')} c/u</p>
                </div>
              </div>
              <p className="text-white font-medium shrink-0">
                ${(Number(item.unit_price) * item.quantity).toLocaleString('es-MX')}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 mt-4 pt-4 space-y-1">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toLocaleString('es-MX')}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>
                Descuento
                {order.coupon_code && <span className="font-mono text-xs ml-1.5 bg-green-500/15 px-1.5 py-0.5 rounded">{order.coupon_code}</span>}
              </span>
              <span>−${Number(order.discount).toLocaleString('es-MX')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Envío</span>
            <span>${Number(order.shipping_cost).toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between text-base text-white font-semibold pt-1">
            <span>Total</span>
            <span>${Number(order.total).toLocaleString('es-MX')} MXN</span>
          </div>
        </div>
      </div>
    </div>
  )
}
