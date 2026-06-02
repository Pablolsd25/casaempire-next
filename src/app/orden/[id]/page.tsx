import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Order } from '@/types'
import type { Metadata } from 'next'
import OrderTimeline from './OrderTimeline'
import AutoRefresh from './AutoRefresh'

export const metadata: Metadata = { title: 'Detalle de orden' }

// Siempre dinámico: el estado del pedido debe reflejar cambios del admin en cada refresco
export const dynamic = 'force-dynamic'

interface Props {
  params:      Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Banners según estado de la orden
// ─────────────────────────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: string }) {
  if (status === 'paid' || status === 'shipped' || status === 'delivered') {
    return (
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-white font-black text-3xl mb-2">
          {status === 'delivered' ? '¡Pedido entregado!' : '¡Gracias por tu compra!'}
        </h1>
        <p className="text-zinc-400">
          {status === 'shipped'
            ? 'Tu pedido está en camino. Revisa el número de guía abajo.'
            : status === 'delivered'
            ? 'Esperamos que hayas disfrutado tu pedido.'
            : 'Tu pedido ha sido confirmado y está siendo procesado.'}
        </p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-yellow-400" style={{ animationDuration: '3s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-white font-black text-3xl mb-2">Pago en proceso</h1>
        <p className="text-zinc-400 mb-2">Tu banco está autorizando el pago. Esto puede tomar unos minutos.</p>
        <div className="bg-yellow-950 border border-yellow-800 text-yellow-300 text-sm rounded-lg px-4 py-3 max-w-md">
          No es necesario volver a pagar. Te notificaremos cuando el pago sea confirmado.
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-white font-black text-3xl mb-2">Pago no completado</h1>
        <p className="text-zinc-400 mb-2">
          El pago de esta orden no fue aprobado. No se realizó un cargo exitoso.
        </p>
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 max-w-md">
          Puedes intentar de nuevo desde el{' '}
          <Link href="/carrito" className="underline hover:text-red-200">
            carrito
          </Link>{' '}
          o escribirnos por{' '}
          <a href="https://wa.me/525571527659" className="underline hover:text-red-200">
            WhatsApp
          </a>
          .
        </div>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-white font-black text-3xl mb-2">Orden cancelada</h1>
        <p className="text-zinc-400 mb-2">Esta orden fue cancelada o el pago fue revertido.</p>
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 max-w-md">
          Si realizaste un pago, será reembolsado en 3–5 días hábiles.{' '}
          <a href="https://wa.me/525571527659" className="underline hover:text-red-200">WhatsApp</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center mb-8">
      <h1 className="text-white font-black text-3xl mb-2">Tu pedido</h1>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default async function OrdenPage({ params, searchParams }: Props) {
  const { id }     = await params
  const { status: qStatus } = await searchParams

  const supabase   = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(name, images))')
    .eq('id', id)
    .single()

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-white font-bold text-2xl mb-4">Orden no encontrada</h1>
        <p className="text-zinc-500 text-sm mb-6">El número de orden no existe o el enlace expiró.</p>
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Volver al inicio</Link>
      </div>
    )
  }

  // ── Ownership check para usuarios autenticados ────────────────────────────
  // Si el usuario está logueado pero la orden NO es suya → acceso denegado
  // Si el usuario es guest (sin sesión) → se muestra la orden (UUID como seguridad)
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (user) {
    const isOwner =
      order.profile_id === user.id ||
      order.customer_email === user.email
    if (!isOwner) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-white font-bold text-2xl mb-4">Sin acceso</h1>
          <p className="text-zinc-500 text-sm mb-6">Esta orden no pertenece a tu cuenta.</p>
          <Link href="/mis-pedidos" className="text-accent hover:underline text-sm">
            Buscar mi pedido →
          </Link>
        </div>
      )
    }
  }

  const o = order as Order & {
    items: Array<{ product: { name: string; images: string[] }; quantity: number; unit_price: number }>
  }

  const displayStatus = qStatus ?? o.status

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">

      <StatusBanner status={displayStatus} />

      <AutoRefresh status={displayStatus} />

      <OrderTimeline status={displayStatus} />

      <p className="text-zinc-500 text-sm mb-2">
        Número de orden:{' '}
        <span className="text-zinc-300 font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
      </p>
      {o.customer_email && (
        <p className="text-zinc-500 text-sm mb-8">
          Correo: <span className="text-zinc-300">{o.customer_email}</span>
        </p>
      )}
      {!o.customer_email && <div className="mb-8" />}

      {/* ── Número de guía ─────────────────────────────────────────────────── */}
      {o.tracking_number && (
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-5 mb-6 text-left">
          <p className="text-blue-400 text-xs uppercase tracking-wider font-semibold mb-1">Número de guía</p>
          <p className="text-white font-mono text-lg font-bold">{o.tracking_number}</p>
          <p className="text-blue-300/70 text-xs mt-1">
            Usa este número para rastrear tu paquete con la paquetería.
          </p>
        </div>
      )}

      {/* ── Resumen del pedido ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-left mb-8">
        <h2 className="text-white font-semibold mb-4">Resumen del pedido</h2>
        <div className="space-y-3 mb-4">
          {o.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm gap-3">
              {item.product?.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-10 h-10 rounded object-cover shrink-0 border border-zinc-700"
                />
              )}
              <span className="text-zinc-400 flex-1">{item.product?.name} × {item.quantity}</span>
              <span className="text-zinc-300 shrink-0">${(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-800 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span><span>${o.subtotal.toFixed(2)}</span>
          </div>
          {o.discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Descuento</span>
              <span>−${o.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-400">
            <span>Envío</span><span>${o.shipping_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-zinc-800">
            <span>
              Total{' '}
              {displayStatus === 'pending'
                ? 'a cobrar'
                : displayStatus === 'failed'
                  ? '(no cobrado)'
                  : 'pagado'}
            </span>
            <span>${o.total.toFixed(2)} MXN</span>
          </div>
        </div>
      </div>

      {/* ── Acciones ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/tienda" className="bg-white text-black font-semibold px-8 py-3 rounded-lg hover:bg-zinc-200 transition-colors">
          Seguir comprando
        </Link>
        {user ? (
          <Link href="/admin/ordenes" className="border border-zinc-600 text-white font-semibold px-8 py-3 rounded-lg hover:border-zinc-400 transition-colors">
            Panel de órdenes
          </Link>
        ) : (
          <Link href="/mis-pedidos" className="border border-zinc-600 text-white font-semibold px-8 py-3 rounded-lg hover:border-zinc-400 transition-colors">
            Buscar mi pedido
          </Link>
        )}
        {displayStatus === 'pending' && (
          <a href="https://wa.me/525571527659" target="_blank" rel="noopener noreferrer"
            className="border border-green-700 text-green-400 font-semibold px-8 py-3 rounded-lg hover:border-green-500 transition-colors">
            WhatsApp soporte
          </a>
        )}
      </div>
    </div>
  )
}
