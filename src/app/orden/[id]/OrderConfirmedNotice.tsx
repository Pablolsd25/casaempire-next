'use client'

interface Props {
  orderId: string
  email: string | null
}

export default function OrderConfirmedNotice({ orderId, email }: Props) {
  const shortId = orderId.slice(0, 8).toUpperCase()

  const copyId = () => {
    void navigator.clipboard?.writeText(shortId)
  }

  return (
    <div className="mb-8 bg-green-950/50 border border-green-800 rounded-xl p-6 text-center max-w-lg mx-auto">
      <p className="text-green-400 text-xs uppercase tracking-widest font-semibold mb-2">
        Compra confirmada
      </p>
      <p className="text-white text-lg mb-1">Tu número de orden es</p>
      <p className="text-white font-mono text-3xl font-bold tracking-wider mb-3">#{shortId}</p>
      <button
        type="button"
        onClick={copyId}
        className="text-green-300/80 text-xs hover:text-green-200 underline mb-3"
      >
        Copiar número
      </button>
      {email && (
        <p className="text-zinc-400 text-sm">
          Enviamos el detalle a <span className="text-zinc-200">{email}</span>
        </p>
      )}
      <p className="text-zinc-500 text-xs mt-3">
        Guarda este número para dar seguimiento a tu pedido.
      </p>
    </div>
  )
}
