'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/cart'
import { readLastOrder, saveLastOrder } from '@/lib/checkout-session'
import { LEGAL } from '@/lib/site-legal'

function ThreeDsReturnContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const clearCart    = useCartStore((s) => s.clearCart)
  const chargeId     = searchParams.get('id')
  const message = 'Confirmando tu pago con el banco…'
  const [error, setError]     = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (!chargeId) {
      setError('No se recibió la referencia del pago. Intenta de nuevo desde el checkout.')
      return
    }
    if (started.current) return
    started.current = true

    ;(async () => {
      try {
        const res = await fetch(
          `/api/checkout/3ds-confirm?chargeId=${encodeURIComponent(chargeId)}`
        )
        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? 'No pudimos confirmar el pago.')
          return
        }

        if (!data.orderId) {
          setError('No se encontró tu orden. Escríbenos por WhatsApp con tu comprobante.')
          return
        }

        const stored = readLastOrder()
        saveLastOrder(data.orderId, stored?.email ?? '')

        if (data.status === 'paid') {
          clearCart()
          router.replace(`/orden/${data.orderId}?confirmed=1`)
          return
        }

        if (data.status === 'pending') {
          clearCart()
          router.replace(`/orden/${data.orderId}?confirmed=1&status=pending`)
          return
        }

        if (data.status === 'failed') {
          router.replace(`/orden/${data.orderId}?status=failed`)
          return
        }

        setError('Estado de pago desconocido. Revisa Mis pedidos o contáctanos.')
      } catch {
        setError('Error de conexión. Verifica tu internet e intenta abrir el enlace de nuevo.')
      }
    })()
  }, [chargeId, clearCart, router])

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-white font-black text-2xl mb-3">Autenticación 3D Secure</h1>
      <p className="text-zinc-500 text-sm mb-8">
        {LEGAL.tradeName} · {LEGAL.legalName}
      </p>

      {error ? (
        <>
          <p className="text-red-400 mb-6">{error}</p>
          <Link
            href="/checkout"
            className="inline-block bg-accent text-black font-bold px-6 py-3 rounded-lg hover:opacity-90"
          >
            Volver al checkout
          </Link>
        </>
      ) : (
        <>
          <div
            className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"
            aria-hidden
          />
          <p className="text-zinc-400">{message}</p>
        </>
      )}
    </div>
  )
}

export default function ThreeDsReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-20 text-center text-zinc-400">
          Cargando…
        </div>
      }
    >
      <ThreeDsReturnContent />
    </Suspense>
  )
}
