'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Error al eliminar la orden')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar orden"
      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
    >
      <Trash2 size={14} />
    </button>
  )
}
