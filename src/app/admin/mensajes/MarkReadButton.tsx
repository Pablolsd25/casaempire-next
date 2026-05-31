'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MarkReadButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const mark = async () => {
    setLoading(true)
    await fetch(`/api/admin/mensajes/${id}`, { method: 'PATCH' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={mark}
      disabled={loading}
      className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500
        px-2 py-1 rounded transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Marcar leído'}
    </button>
  )
}
