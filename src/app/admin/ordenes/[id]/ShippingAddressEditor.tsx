'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MexicoAddressFields from '@/components/checkout/MexicoAddressFields'
import {
  formatShippingAddressLines,
  isShippingAddressIncomplete,
  type ShippingAddressFields,
} from '@/lib/shipping-address'

type FormState = {
  street: string
  numExterior: string
  numInterior: string
  referencias: string
  colonia: string
  municipio: string
  state: string
  zip: string
  country: string
}

function toFormState(addr: ShippingAddressFields | null): FormState {
  return {
    street:      addr?.street ?? '',
    numExterior: addr?.numExterior ?? '',
    numInterior: addr?.numInterior ?? '',
    referencias: addr?.referencias ?? '',
    colonia:     addr?.colonia ?? '',
    municipio:   addr?.municipio ?? addr?.city ?? '',
    state:       addr?.state ?? '',
    zip:         addr?.zip ?? addr?.zip_code ?? '',
    country:     addr?.country ?? 'México',
  }
}

function toPayload(form: FormState, preserve?: ShippingAddressFields | null) {
  return {
    street:      form.street.trim(),
    numExterior: form.numExterior.trim(),
    numInterior: form.numInterior.trim(),
    referencias: form.referencias.trim(),
    colonia:     form.colonia.trim(),
    municipio:   form.municipio.trim(),
    state:       form.state.trim(),
    zip:         form.zip.replace(/\D/g, '').slice(0, 5),
    country:     form.country.trim() || 'México',
    ...(preserve?.phone ? { phone: preserve.phone } : {}),
    ...(preserve?.email ? { email: preserve.email } : {}),
  }
}

const fieldClass =
  'w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500'

export default function ShippingAddressEditor({
  orderId,
  initialAddress,
  customerName,
}: {
  orderId: string
  initialAddress: ShippingAddressFields | null
  customerName?: string | null
}) {
  const router = useRouter()
  const incomplete = isShippingAddressIncomplete(initialAddress)
  const [editing, setEditing] = useState(incomplete)
  const [form, setForm] = useState<FormState>(() => toFormState(initialAddress))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const display = formatShippingAddressLines(initialAddress)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_address: toPayload(form, initialAddress),
      }),
    })

    setSaving(false)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error ?? 'No se pudo guardar la dirección.')
      return
    }

    setSaved(true)
    setEditing(false)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  const handleCancel = () => {
    setForm(toFormState(initialAddress))
    setError('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Dirección de envío
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-accent text-xs font-medium hover:underline shrink-0"
          >
            {incomplete ? 'Agregar dirección' : 'Editar'}
          </button>
        </div>

        {incomplete ? (
          <div className="bg-yellow-950/50 border border-yellow-800/60 rounded-lg px-3 py-2.5 mb-2">
            <p className="text-yellow-300 text-xs">
              Dirección incompleta. Agrégala para poder enviar este pedido.
            </p>
          </div>
        ) : null}

        {customerName && (
          <p className="text-white text-sm font-medium mb-0.5">{customerName}</p>
        )}
        {display.street ? (
          <p className="text-zinc-300 text-sm">{display.street}</p>
        ) : (
          <p className="text-zinc-500 text-sm italic">Sin calle registrada</p>
        )}
        {display.city && <p className="text-zinc-300 text-sm">{display.city}</p>}
        {initialAddress?.colonia && (
          <p className="text-zinc-500 text-xs mt-1">Colonia: {initialAddress.colonia}</p>
        )}
        {initialAddress?.referencias && (
          <p className="text-zinc-500 text-xs mt-1">Ref: {initialAddress.referencias}</p>
        )}
        {saved && <p className="text-green-400 text-xs mt-2">Dirección guardada.</p>}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-zinc-500 text-xs uppercase tracking-wide">
          {incomplete ? 'Agregar dirección de envío' : 'Editar dirección de envío'}
        </p>
      </div>

      {incomplete && (
        <p className="text-yellow-300/90 text-xs">
          Este pedido se recuperó sin dirección. Captúrala con el cliente.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-zinc-500 text-xs mb-1">Calle *</label>
          <input
            type="text"
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            className={fieldClass}
            placeholder="Ej. Av. Insurgentes Sur"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-zinc-500 text-xs mb-1">No. exterior</label>
            <input
              type="text"
              value={form.numExterior}
              onChange={(e) => setForm((f) => ({ ...f, numExterior: e.target.value }))}
              className={fieldClass}
              placeholder="123"
            />
          </div>
          <div>
            <label className="block text-zinc-500 text-xs mb-1">No. interior</label>
            <input
              type="text"
              value={form.numInterior}
              onChange={(e) => setForm((f) => ({ ...f, numInterior: e.target.value }))}
              className={fieldClass}
              placeholder="Depto 4B"
            />
          </div>
        </div>

        <MexicoAddressFields
          value={{
            zip: form.zip,
            colonia: form.colonia,
            municipio: form.municipio,
            state: form.state,
          }}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        <div>
          <label className="block text-zinc-500 text-xs mb-1">
            Referencias {!form.numExterior.trim() ? '*' : '(opcional)'}
          </label>
          <input
            type="text"
            value={form.referencias}
            onChange={(e) => setForm((f) => ({ ...f, referencias: e.target.value }))}
            className={fieldClass}
            placeholder="Entre calles, color de fachada…"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {saved && <p className="text-green-400 text-xs">Dirección guardada.</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-3 py-2 bg-accent text-black rounded text-sm font-semibold
            hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Guardando…' : 'Guardar dirección'}
        </button>
        {!incomplete && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded text-sm hover:bg-zinc-700
              disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
