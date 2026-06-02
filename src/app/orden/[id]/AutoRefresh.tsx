'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Refresca el estado del pedido cada 30s para reflejar cambios del admin.
// Deja de refrescar cuando el pedido llega a un estado final.
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoRefresh({
  status,
  intervalMs = 30000,
}: {
  status: string
  intervalMs?: number
}) {
  const router = useRouter()
  const isFinal =
    status === 'delivered' || status === 'cancelled' || status === 'failed'

  useEffect(() => {
    if (isFinal) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, isFinal, intervalMs])

  return null
}
