'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'

declare global {
  interface Window {
    OpenPay: {
      setId: (id: string) => void
      setApiKey: (key: string) => void
      setSandboxMode: (sandbox: boolean) => void
      token: {
        create: (
          data: Record<string, string>,
          onSuccess: (r: { data: { id: string } }) => void,
          onError: (e: { message: string }) => void
        ) => void
      }
      deviceData: { setup: () => string }
    }
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, total, clearCart } = useCartStore()
  const sub = subtotal()
  const tot = total()

  const [openpayReady, setOpenpayReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', state: '', zip: '',
    cardNumber: '', cardExpMonth: '', cardExpYear: '', cardCvv: '', cardName: '',
  })

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (items.length === 0) router.replace('/carrito')
  }, [items.length, router])

  // Cargar OpenPay.js
  useEffect(() => {
    if (document.getElementById('openpay-js')) { setOpenpayReady(true); return }
    const script = document.createElement('script')
    script.id = 'openpay-js'
    script.src = 'https://js.openpay.mx/openpay.v1.min.js'
    script.onload = () => {
      window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!)
      window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY!)
      window.OpenPay.setSandboxMode(process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === 'true')
      setOpenpayReady(true)
    }
    document.head.appendChild(script)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!openpayReady) {
      setError('OpenPay no está listo. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // 1. Tokenizar la tarjeta con OpenPay.js
    window.OpenPay.token.create(
      {
        card_number:       form.cardNumber.replace(/\s/g, ''),
        holder_name:       form.cardName,
        expiration_year:   form.cardExpYear,
        expiration_month:  form.cardExpMonth,
        cvv2:              form.cardCvv,
      },
        async (response) => {
        const token = response.data.id
        // Sandbox: device_session_id = 32 hex chars (OpenPay max=32, UUID sin guiones)
        const deviceSessionId = crypto.randomUUID().replace(/-/g, '')

        // 2. Enviar al backend
        try {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              deviceSessionId,
              amount: tot,
              items: items.map((i) => ({
                productId: i.product.id,
                name:      i.product.name,
                quantity:  i.quantity,
                price:     i.product.price,
              })),
              customer: {
                firstName: form.firstName,
                lastName:  form.lastName,
                email:     form.email,
                phone:     form.phone,
              },
              shippingAddress: {
                street:  form.street,
                city:    form.city,
                state:   form.state,
                zip:     form.zip,
                country: 'México',
              },
            }),
          })

          const data = await res.json()

          if (!res.ok) {
            setError(data.error ?? 'Error al procesar el pago.')
            setLoading(false)
            return
          }

          clearCart()
          router.push(`/orden/${data.orderId}`)
        } catch {
          setError('Error de conexión. Intenta de nuevo.')
          setLoading(false)
        }
      },
      (err) => {
        setError(`Error con la tarjeta: ${err.message}`)
        setLoading(false)
      }
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-white font-black text-3xl mb-8">Finalizar compra</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos personales */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Datos de contacto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'firstName', label: 'Nombre',  type: 'text', required: true },
                { name: 'lastName',  label: 'Apellido', type: 'text', required: true },
                { name: 'email',     label: 'Correo electrónico', type: 'email', required: true },
                { name: 'phone',     label: 'Teléfono', type: 'tel', required: true },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-zinc-400 text-sm mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    name={f.name}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    required={f.required}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Dirección de envío */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Dirección de envío</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'street', label: 'Calle y número', colSpan: 'sm:col-span-2' },
                { name: 'city',   label: 'Ciudad' },
                { name: 'state',  label: 'Estado' },
                { name: 'zip',    label: 'Código postal' },
              ].map((f) => (
                <div key={f.name} className={f.colSpan}>
                  <label className="block text-zinc-400 text-sm mb-1">{f.label}</label>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Datos de tarjeta */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-1">Datos de tarjeta</h2>
            <p className="text-zinc-500 text-xs mb-4">Pago seguro procesado por OpenPay</p>

            {/* Tarjetas de prueba — solo en sandbox */}
            {process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === 'true' && (
              <div className="mb-4 bg-zinc-800 border border-zinc-600 rounded-lg p-3 text-xs space-y-1">
                <p className="text-accent font-semibold uppercase tracking-wide mb-2">Modo sandbox — tarjetas de prueba</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-zinc-400">
                  <span><span className="text-white font-mono">4111 1111 1111 1111</span> — Visa (aprobada)</span>
                  <span><span className="text-white font-mono">5500 0000 0000 0004</span> — MC (aprobada)</span>
                  <span><span className="text-white font-mono">4000 0000 0000 0002</span> — Visa (rechazada)</span>
                </div>
                <p className="text-zinc-500 mt-1">Fecha: cualquier mes/año futuro · CVV: cualquier 3 dígitos</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Número de tarjeta</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={form.cardNumber}
                  onChange={handleChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                    focus:outline-none focus:border-zinc-500 text-sm font-mono tracking-widest"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Nombre en la tarjeta</label>
                <input
                  type="text"
                  name="cardName"
                  value={form.cardName}
                  onChange={handleChange}
                  placeholder="Como aparece en la tarjeta"
                  required
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                    focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">Mes</label>
                  <input
                    type="text" name="cardExpMonth" value={form.cardExpMonth}
                    onChange={handleChange} placeholder="MM" maxLength={2} required
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">Año</label>
                  <input
                    type="text" name="cardExpYear" value={form.cardExpYear}
                    onChange={handleChange} placeholder="YY" maxLength={2} required
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">CVV</label>
                  <input
                    type="password" name="cardCvv" value={form.cardCvv}
                    onChange={handleChange} placeholder="•••" maxLength={4} required
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-20">
            <h2 className="text-white font-semibold text-lg mb-4">Tu pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-zinc-400 truncate max-w-[160px]">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="text-zinc-300">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span><span>${sub.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Envío</span><span>$99.00</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-zinc-800">
                <span>Total</span><span>${tot.toFixed(2)} MXN</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !openpayReady}
              className="mt-6 w-full bg-white text-black font-bold py-4 rounded-xl text-base
                hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                `Pagar $${tot.toFixed(2)} MXN`
              )}
            </button>

            <p className="text-zinc-600 text-xs text-center mt-3">
              Pago 100% seguro con OpenPay
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
