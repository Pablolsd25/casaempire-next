'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Error al eliminar el producto')
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setError('')
          setOpen(true)
        }}
        disabled={loading}
        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40"
      >
        Eliminar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-md bg-zinc-900 border border-red-900/50 rounded-xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 id="delete-product-title" className="text-white font-semibold text-lg">
                  ¿Eliminar este producto?
                </h2>
                <p className="text-accent text-sm mt-1 font-medium">{name}</p>
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-2">
              Esta acción es <strong className="text-red-400">permanente</strong>. El producto
              dejará de aparecer en la tienda y no se puede deshacer.
            </p>
            <p className="text-zinc-500 text-xs mb-6">
              Si solo quieres ocultarlo temporalmente, edita el producto y desactívalo en lugar
              de eliminarlo.
            </p>

            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm text-zinc-300 border border-zinc-700 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
