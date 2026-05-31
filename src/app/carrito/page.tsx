'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { AppliedCoupon } from '@/types'

export default function CarritoPage() {
  const {
    items, removeItem, updateQuantity, subtotal, total, clearCart,
    coupon, applyCoupon, removeCoupon, discount, shipping,
  } = useCartStore()
  const sub  = subtotal()
  const tot  = total()
  const desc = discount()
  const ship = shipping()

  const [code, setCode]       = useState('')
  const [applying, setApplying] = useState(false)
  const [couponMsg, setCouponMsg] = useState('')

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setApplying(true)
    setCouponMsg('')
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal: sub }),
      })
      const data = await res.json()
      if (data.valid && data.coupon) {
        const applied: AppliedCoupon = {
          code:         data.coupon.code,
          type:         data.coupon.type,
          value:        data.coupon.value,
          discount:     data.discount,
          freeShipping: data.freeShipping,
        }
        applyCoupon(applied)
        setCode('')
        setCouponMsg('')
      } else {
        setCouponMsg(data.message ?? 'Cupón inválido.')
      }
    } catch {
      setCouponMsg('Error al validar el cupón.')
    } finally {
      setApplying(false)
    }
  }

  const handleRemoveCoupon = () => {
    removeCoupon()
    setCouponMsg('')
  }


  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <svg className="w-20 h-20 text-zinc-700 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h1 className="text-white font-bold text-2xl mb-3">Tu carrito está vacío</h1>
        <p className="text-zinc-400 mb-8">Agrega productos para continuar.</p>
        <Link href="/tienda" className="bg-white text-black font-semibold px-8 py-3 rounded-lg hover:bg-zinc-200 transition-colors">
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white font-black text-3xl">Carrito</h1>
        <button onClick={clearCart} className="text-zinc-500 hover:text-red-400 text-sm transition-colors">
          Vaciar carrito
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.product.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex gap-4">
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                {item.product.images[0] ? (
                  <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium">{item.product.name}</h3>
                <p className="text-zinc-400 text-sm">${item.product.price.toFixed(2)} MXN c/u</p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm">−</button>
                    <span className="px-3 py-1 text-white text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm">+</button>
                  </div>
                  <button onClick={() => removeItem(item.product.id)} className="text-zinc-600 hover:text-red-500 transition-colors text-sm">
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-white font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                <p className="text-zinc-500 text-xs">MXN</p>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-20">
            <h2 className="text-white font-semibold text-lg mb-4">Resumen del pedido</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${sub.toFixed(2)} MXN</span>
              </div>

              {coupon && (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1.5">
                    Descuento
                    <span className="font-mono text-xs bg-green-500/15 px-1.5 py-0.5 rounded">{coupon.code}</span>
                  </span>
                  <span>−${desc.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-400">
                <span>Envío</span>
                {coupon?.freeShipping ? (
                  <span className="text-green-400">Gratis</span>
                ) : (
                  <span>${ship.toFixed(2)} MXN</span>
                )}
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between text-white font-semibold text-base">
                <span>Total</span>
                <span>${tot.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Cupón */}
            <div className="mt-5 pt-5 border-t border-zinc-800">
              {coupon ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5">
                  <div className="text-sm">
                    <span className="text-green-400 font-mono font-bold">{coupon.code}</span>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {coupon.type === 'free_shipping' ? 'Envío gratis aplicado' : 'Descuento aplicado'}
                    </p>
                  </div>
                  <button onClick={handleRemoveCoupon}
                    className="text-zinc-400 hover:text-red-400 text-xs transition-colors">
                    Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply}>
                  <label className="block text-zinc-400 text-xs mb-2">¿Tienes un cupón?</label>
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-accent"
                    />
                    <button type="submit" disabled={applying || !code.trim()}
                      className="px-4 py-2 rounded-lg text-sm bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {applying ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponMsg && <p className="text-red-400 text-xs mt-2">{couponMsg}</p>}
                </form>
              )}
            </div>


            <Link
              href="/checkout"
              className="mt-6 block w-full bg-white text-black text-center font-semibold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Proceder al pago
            </Link>

            <Link
              href="/tienda"
              className="mt-3 block w-full text-zinc-400 text-center text-sm hover:text-white transition-colors"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
