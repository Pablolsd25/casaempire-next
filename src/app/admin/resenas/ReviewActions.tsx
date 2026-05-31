'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ReviewActions({ id, isApproved }: { id: string; isApproved: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const update = async (approve: boolean) => {
    setLoading(true)
    await fetch(`/api/admin/resenas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: approve }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!isApproved && (
        <button onClick={() => update(true)} disabled={loading}
          className="text-xs text-green-400 hover:text-green-300 border border-green-500/30
            hover:border-green-400/50 px-2 py-1 rounded transition-colors disabled:opacity-50">
          Aprobar
        </button>
      )}
      {isApproved && (
        <button onClick={() => update(false)} disabled={loading}
          className="text-xs text-zinc-500 hover:text-white border border-zinc-700
            px-2 py-1 rounded transition-colors disabled:opacity-50">
          Rechazar
        </button>
      )}
    </div>
  )
}
