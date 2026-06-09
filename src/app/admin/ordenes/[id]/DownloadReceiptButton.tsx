'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

export default function DownloadReceiptButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/receipt`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      const blob = await res.blob()
      if (!blob.type.includes('pdf')) {
        throw new Error('La respuesta no es un PDF válido.')
      }

      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `recibo-${orderId.slice(0, 8)}.pdf`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el recibo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 border border-zinc-600 text-zinc-300
          hover:border-accent hover:text-white px-4 py-2 rounded-lg text-sm transition-colors
          disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {loading ? 'Generando PDF…' : 'Descargar recibo PDF'}
      </button>
      {error && <p className="text-red-400 text-xs max-w-xs text-right">{error}</p>}
    </div>
  )
}
