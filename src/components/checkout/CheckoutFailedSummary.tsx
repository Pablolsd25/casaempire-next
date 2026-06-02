'use client'

import Link from 'next/link'

export type FailedCheckoutSnapshot = {
  error: string
  subtotal: number
  shipping: number
  discount: number
  total: number
  items: Array<{ name: string; quantity: number; lineTotal: number }>
}

type Props = {
  snapshot: FailedCheckoutSnapshot
  onRetry: () => void
}

export default function CheckoutFailedSummary({ snapshot, onRetry }: Props) {
  return (
    <div className="lg:col-span-3 space-y-6">
      <div className="bg-red-950/40 border border-red-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-white font-display font-bold text-2xl uppercase tracking-tight">
          Pago no completado
        </h2>
        <p className="text-red-300/90 text-sm mt-3 max-w-md mx-auto">{snapshot.error}</p>
        <p className="text-zinc-500 text-xs mt-4">
          No se realizó ningún cargo exitoso. Puedes intentar de nuevo con otra tarjeta.
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-lg mx-auto">
        <h3 className="text-white font-semibold mb-4">Detalle del intento de compra</h3>
        <div className="space-y-2 mb-4">
          {snapshot.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-zinc-400 truncate max-w-[200px]">
                {item.name} × {item.quantity}
              </span>
              <span className="text-zinc-300">${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-800 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>${snapshot.subtotal.toFixed(2)}</span>
          </div>
          {snapshot.discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Descuento</span>
              <span>−${snapshot.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-400">
            <span>Envío</span>
            <span>${snapshot.shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white font-bold pt-2 border-t border-zinc-800">
            <span>Total</span>
            <span>${snapshot.total.toFixed(2)} MXN</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="btn-accent px-8 py-3 rounded-lg text-sm font-semibold"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/carrito"
          className="border border-zinc-600 text-white px-8 py-3 rounded-lg text-sm text-center hover:border-zinc-400 transition-colors"
        >
          Volver al carrito
        </Link>
      </div>
    </div>
  )
}
