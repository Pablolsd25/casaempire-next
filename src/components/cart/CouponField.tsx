'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { AppliedCoupon } from '@/types'

export default function CouponField({ className = '' }: { className?: string }) {
  const { coupon, applyCoupon, removeCoupon, subtotal } = useCartStore()
  const sub = subtotal()

  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [couponMsg, setCouponMsg] = useState('')

  const handleApply = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setApplying(true)
    setCouponMsg('')
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, subtotal: sub }),
      })
      const data = await res.json()
      if (data.valid && data.coupon) {
        const applied: AppliedCoupon = {
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          discount: data.discount,
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      void handleApply()
    }
  }

  return (
    <div className={className}>
      {coupon ? (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5">
          <div className="text-sm min-w-0">
            <span className="text-green-400 font-mono font-bold">{coupon.code}</span>
            <p className="text-zinc-400 text-xs mt-0.5">
              {coupon.type === 'free_shipping' ? 'Envío gratis aplicado' : 'Descuento aplicado'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { removeCoupon(); setCouponMsg('') }}
            className="text-zinc-400 hover:text-red-400 text-xs transition-colors shrink-0 ml-2"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div>
          <label className="block text-zinc-400 text-xs mb-2">¿Tienes un cupón de descuento?</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={onKeyDown}
              placeholder="CÓDIGO"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={applying || !code.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {applying ? '...' : 'Aplicar'}
            </button>
          </div>
          {couponMsg && <p className="text-red-400 text-xs mt-2">{couponMsg}</p>}
        </div>
      )}
    </div>
  )
}
