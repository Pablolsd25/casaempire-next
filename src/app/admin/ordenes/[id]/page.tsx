import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import OrderStatusButton from './OrderStatusButton'
import TrackingInput from './TrackingInput'
import RefundButton from './RefundButton'

export const metadata = { title: 'Detalle de Orden | Admin' }

/* ── Badge maps ──────────────────────────────────────────────────────── */
const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente de pago', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  paid:      { label: 'Pagado',            cls: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  shipped:   { label: 'Pagado',            cls: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  delivered: { label: 'Pagado',            cls: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  cancelled: { label: 'Cancelado',         cls: 'bg-red-500/20    text-red-400    border-red-500/30'    },
}

const FUL_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'No completado', cls: 'bg-zinc-700/60 text-zinc-300  border-zinc-600'         },
  paid:      { label: 'No completado', cls: 'bg-zinc-700/60 text-zinc-300  border-zinc-600'         },
  shipped:   { label: 'En camino',     cls: 'bg-blue-500/20 text-blue-400  border-blue-500/30'      },
  delivered: { label: 'Completado',    cls: 'bg-accent/20   text-accent    border-accent/30'        },
  cancelled: { label: 'Cancelado',     cls: 'bg-red-500/20  text-red-400   border-red-500/30'       },
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

function initials(name?: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

/* ── Page ─────────────────────────────────────────────────────────────── */
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
        id, quantity, unit_price, name, product_image,
        product:products(id, name, slug, images)
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const addr      = order.shipping_address as Record<string, string> | null
  const canRefund = ['paid', 'shipped'].includes(order.status) && !!order.openpay_transaction_id
  const hasNext   = (NEXT_STATUS[order.status]?.length ?? 0) > 0
  const showTracking = ['paid', 'shipped', 'delivered'].includes(order.status)

  const payBadge = PAY_BADGE[order.status] ?? PAY_BADGE.pending
  const fulBadge = FUL_BADGE[order.status] ?? FUL_BADGE.pending

  const title = order.wix_order_number
    ? `Pedido n.º ${order.wix_order_number}`
    : `Orden #${order.id.slice(0, 8).toUpperCase()}`

  const dateStr = new Date(order.created_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Address helpers
  const addrStreet = addr
    ? [addr.street, addr.numExterior ? `No. ${addr.numExterior}` : '', addr.numInterior ? `Int. ${addr.numInterior}` : '']
        .filter(Boolean).join(' ')
    : null
  const addrCity = addr
    ? [addr.municipio ?? addr.city, addr.state, addr.zip ?? addr.zip_code, addr.country]
        .filter(Boolean).join(', ')
    : null

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white font-display font-bold text-3xl uppercase tracking-wide">
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${payBadge.cls}`}>
              {payBadge.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${fulBadge.cls}`}>
              {fulBadge.label}
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-2">Realizado el {dateStr}</p>
        </div>
        {canRefund && <RefundButton orderId={order.id} />}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ════════ LEFT COLUMN ════════ */}
        <div className="space-y-4">

          {/* ── Items card ─────────────────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-zinc-800">
              <p className="text-white font-semibold">
                Ítems ({(order.items ?? []).length})
              </p>
            </div>

            {/* Sub-header: "Productos a enviar" + tracking inline */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-zinc-400 text-sm font-medium shrink-0">Productos a enviar</p>
              {showTracking && (
                <div className="flex-1 min-w-0 max-w-xs">
                  <TrackingInput orderId={order.id} initialValue={order.tracking_number ?? null} />
                </div>
              )}
            </div>

            {/* Product rows */}
            <div className="divide-y divide-zinc-800/60">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(order.items ?? []).map((item: any) => {
                const name     = item.name ?? item.product?.name ?? 'Producto eliminado'
                const img      = item.product_image ?? item.product?.images?.[0]
                const lineTotal = Number(item.unit_price) * item.quantity
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={name}
                        className="w-14 h-14 rounded object-cover border border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded bg-zinc-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-snug">{name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        ${Number(item.unit_price).toLocaleString('es-MX')} &times; {item.quantity}
                      </p>
                    </div>
                    <p className="text-white font-semibold shrink-0 tabular-nums">
                      ${lineTotal.toLocaleString('es-MX')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Información del pago ───────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold">Información del pago</p>
              <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold uppercase tracking-wide ${payBadge.cls}`}>
                {payBadge.label}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Ítems</span>
                <span className="tabular-nums">${Number(order.subtotal).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Envío</span>
                <span className="tabular-nums">${Number(order.shipping_cost ?? 0).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Impuesto</span>
                <span>$0</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1.5">
                    Descuento
                    {order.coupon_code && (
                      <span className="font-mono text-xs bg-green-500/15 px-1.5 py-0.5 rounded">
                        {order.coupon_code}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">−${Number(order.discount).toLocaleString('es-MX')}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-base border-t border-zinc-800 pt-2 mt-1">
                <span>Total</span>
                <span className="tabular-nums">${Number(order.total).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-zinc-300 font-medium pt-0.5">
                <span>Monto que pagó el cliente</span>
                <span className="tabular-nums">${Number(order.total).toLocaleString('es-MX')}</span>
              </div>
            </div>
          </div>

          {/* ── Actividad del pedido ───────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-white font-semibold mb-5">Actividad del pedido</p>

            <ol className="relative ml-3 space-y-5">
              {/* Event: order placed */}
              <li className="pl-5 relative">
                <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-zinc-500 ring-2 ring-zinc-900" />
                <p className="text-zinc-300 text-sm font-medium leading-snug">
                  {order.customer_name ?? order.customer_email ?? 'Cliente'} realizó un pedido
                </p>
                <p className="text-zinc-600 text-xs mt-0.5">{dateStr}</p>
              </li>

              {/* Event: status change (if not pending) */}
              {order.status !== 'pending' && (
                <li className="pl-5 relative">
                  <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-zinc-500 ring-2 ring-zinc-900" />
                  <p className="text-zinc-300 text-sm font-medium leading-snug">
                    Pedido marcado como {STATUS_LABELS[order.status] ?? order.status}
                  </p>
                </li>
              )}

              {/* Tracking */}
              {order.tracking_number && (
                <li className="pl-5 relative">
                  <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-zinc-900" />
                  <p className="text-zinc-300 text-sm font-medium leading-snug">
                    Número de guía asignado
                  </p>
                  <p className="text-zinc-500 font-mono text-xs mt-0.5">{order.tracking_number}</p>
                </li>
              )}
            </ol>

            {/* Vertical line */}
            <style>{`.activity-line::before{content:'';position:absolute;left:0.375rem;top:0.625rem;bottom:0;width:1px;background:#3f3f46}`}</style>
          </div>

        </div>

        {/* ════════ RIGHT SIDEBAR ════════ */}
        <div className="space-y-4">

          {/* ── Acciones de estado ─────────────────────────────────── */}
          {(hasNext || showTracking) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              {hasNext && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Cambiar estado</p>
                  <div className="flex flex-col gap-2">
                    {NEXT_STATUS[order.status].map((s) => (
                      <OrderStatusButton
                        key={s}
                        orderId={order.id}
                        newStatus={s}
                        label={STATUS_LABELS[s]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Información del pedido ─────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">

            <div className="px-4 py-3">
              <p className="text-white font-semibold text-sm">Información del pedido</p>
            </div>

            {/* Información de contacto */}
            <div className="px-4 py-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Información de contacto</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                  <span className="text-accent text-xs font-bold">{initials(order.customer_name)}</span>
                </div>
                <div className="min-w-0">
                  {order.customer_name && (
                    <p className="text-white text-sm font-medium truncate">{order.customer_name}</p>
                  )}
                  <p className="text-zinc-400 text-xs truncate">{order.customer_email ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Método de envío */}
            <div className="px-4 py-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Método de envío</p>
              <p className="text-zinc-300 text-sm">Envío express</p>
              <p className="text-zinc-600 text-xs mt-0.5">3-5 días hábiles</p>
            </div>

            {/* Dirección de envío */}
            {addr && (
              <div className="px-4 py-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Dirección de envío</p>
                {order.customer_name && (
                  <p className="text-white text-sm font-medium mb-0.5">{order.customer_name}</p>
                )}
                {addrStreet && <p className="text-zinc-300 text-sm">{addrStreet}</p>}
                {addrCity   && <p className="text-zinc-300 text-sm">{addrCity}</p>}
                {addr.referencias && (
                  <p className="text-zinc-500 text-xs mt-1">Ref: {addr.referencias}</p>
                )}
              </div>
            )}

            {/* Colonia */}
            {addr?.colonia && (
              <div className="px-4 py-3">
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Colonia</p>
                <p className="text-zinc-300 text-sm">{addr.colonia}</p>
              </div>
            )}

            {/* Dirección de facturación */}
            <div className="px-4 py-3">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Dirección de facturación</p>
              <p className="text-zinc-500 text-sm italic">Igual que la de envío</p>
            </div>

            {/* ID de transacción */}
            {order.openpay_transaction_id && (
              <div className="px-4 py-3">
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">ID de transacción</p>
                <p className="text-zinc-600 font-mono text-xs break-all leading-relaxed">
                  {order.openpay_transaction_id}
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}
