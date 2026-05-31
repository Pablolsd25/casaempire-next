'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderNoteInput({
  orderId,
  initialNote,
}: {
  orderId: string
  initialNote: string | null
}) {
  const router = useRouter()
  const [value,   setValue]   = useState(initialNote ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notes: value.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? `Error ${res.status} al guardar la nota.`)
    }
  }

  const handleClear = () => {
    setValue('')
    textareaRef.current?.focus()
  }

  const isDirty = value.trim() !== (initialNote ?? '').trim()

  return (
    <div className="space-y-2">
      <p className="text-zinc-500 text-sm">
        Agrega una nota{' '}
        <span className="text-zinc-600">(tu cliente no verá esto)</span>
      </p>

      <div className="flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          rows={3}
          placeholder="Ej: Cliente pidió envío urgente, verificar stock…"
          className="flex-1 resize-none bg-zinc-950 border border-zinc-700 text-white rounded-lg
            px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700
            transition-colors"
        />

        <div className="flex flex-col gap-1.5 pt-0.5">
          {/* Cancel / clear */}
          <button
            type="button"
            onClick={handleClear}
            title="Limpiar"
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
              text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ×
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            title="Guardar nota"
            className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-accent disabled:opacity-40
              flex items-center justify-center text-white transition-colors text-sm"
          >
            {saving ? (
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l3.5 3.5L13 5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {saved && (
        <p className="text-green-400 text-xs">Nota guardada.</p>
      )}
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}
