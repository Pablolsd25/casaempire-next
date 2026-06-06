'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PostalCodeResult } from '@/lib/mexico-postal'

type AddressSlice = {
  zip: string
  colonia: string
  municipio: string
  state: string
}

type Props = {
  value: AddressSlice
  onChange: (patch: Partial<AddressSlice>) => void
}

const inputClass =
  'w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500 text-sm'
const readOnlyClass =
  'w-full bg-zinc-900 text-zinc-300 rounded-lg px-4 py-2.5 border border-zinc-800 text-sm cursor-not-allowed'

export default function MexicoAddressFields({ value, onChange }: Props) {
  const [lookup, setLookup] = useState<PostalCodeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [manual, setManual] = useState(false)
  const [coloniaFilter, setColoniaFilter] = useState('')
  const lastFetchedCp = useRef('')

  const filteredColonias = useMemo(() => {
    if (!lookup) return []
    const q = coloniaFilter.trim().toLowerCase()
    if (!q) return lookup.asentamientos
    return lookup.asentamientos.filter((a) => a.nombre.toLowerCase().includes(q))
  }, [lookup, coloniaFilter])

  useEffect(() => {
    const cp = value.zip.replace(/\D/g, '')
    if (cp.length !== 5) {
      setLookup(null)
      setLookupError('')
      lastFetchedCp.current = ''
      return
    }
    if (cp === lastFetchedCp.current) return

    const timer = setTimeout(() => { void fetchPostalCode(cp) }, 400)
    return () => clearTimeout(timer)
  }, [value.zip])

  async function fetchPostalCode(cp: string) {
    setLoading(true)
    setLookupError('')
    try {
      const res = await fetch(`/api/postal-code?cp=${cp}`)
      const data = await res.json()
      if (!res.ok) {
        setLookup(null)
        setManual(true)
        setLookupError(data.error ?? 'No se encontró el código postal.')
        lastFetchedCp.current = cp
        return
      }

      const result = data as PostalCodeResult
      setLookup(result)
      setManual(false)
      lastFetchedCp.current = cp
      setColoniaFilter('')

      const patch: Partial<AddressSlice> = {
        municipio: result.municipio,
        state: result.estado,
      }

      const match = result.asentamientos.find(
        (a) => a.nombre.toLowerCase() === value.colonia.toLowerCase()
      )
      if (match) {
        patch.colonia = match.nombre
      } else if (result.asentamientos.length === 1) {
        patch.colonia = result.asentamientos[0].nombre
      } else if (
        value.colonia &&
        !result.asentamientos.some((a) => a.nombre === value.colonia)
      ) {
        patch.colonia = ''
      }

      onChange(patch)
    } catch {
      setLookup(null)
      setManual(true)
      setLookupError('Error de conexión. Escribe la colonia manualmente.')
      lastFetchedCp.current = cp
    } finally {
      setLoading(false)
    }
  }

  const handleZipChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 5)
    if (digits !== value.zip) {
      lastFetchedCp.current = ''
      if (digits.length < 5) {
        setLookup(null)
        setLookupError('')
      }
    }
    onChange({ zip: digits })
  }

  const useLookup = Boolean(lookup) && !manual

  return (
    <>
      <div>
        <label className="block text-zinc-400 text-sm mb-1">Código postal</label>
        <input
          type="text"
          name="zip"
          value={value.zip}
          onChange={(e) => handleZipChange(e.target.value)}
          required
          placeholder="Ej. 55748"
          inputMode="numeric"
          maxLength={5}
          className={inputClass}
        />
        {loading && <p className="text-zinc-500 text-xs mt-1">Buscando colonias...</p>}
        {lookupError && <p className="text-amber-400 text-xs mt-1">{lookupError}</p>}
        {useLookup && (
          <p className="text-green-400/80 text-xs mt-1">
            {lookup!.asentamientos.length} colonia(s) encontrada(s)
          </p>
        )}
      </div>

      <div>
        <label className="block text-zinc-400 text-sm mb-1">Colonia</label>
        {useLookup ? (
          <div className="space-y-2">
            {lookup!.asentamientos.length > 8 && (
              <input
                type="text"
                value={coloniaFilter}
                onChange={(e) => setColoniaFilter(e.target.value)}
                placeholder="Filtrar colonia..."
                className={inputClass}
              />
            )}
            <select
              name="colonia"
              value={value.colonia}
              onChange={(e) => onChange({ colonia: e.target.value })}
              required
              className={inputClass}
            >
              <option value="">Selecciona tu colonia</option>
              {filteredColonias.map((a, i) => (
                <option key={`${a.nombre}-${a.tipo}-${i}`} value={a.nombre}>
                  {a.nombre}{a.tipo ? ` (${a.tipo})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setManual(true)}
              className="text-zinc-500 hover:text-zinc-300 text-xs underline"
            >
              Escribir colonia manualmente
            </button>
          </div>
        ) : (
          <input
            type="text"
            name="colonia"
            value={value.colonia}
            onChange={(e) => onChange({ colonia: e.target.value })}
            required
            placeholder={value.zip.length === 5 ? 'Ej. Del Valle' : 'Primero ingresa el C.P.'}
            className={inputClass}
          />
        )}
      </div>

      <div>
        <label className="block text-zinc-400 text-sm mb-1">Municipio / Alcaldía</label>
        {useLookup ? (
          <input type="text" value={value.municipio} readOnly className={readOnlyClass} />
        ) : (
          <input
            type="text"
            name="municipio"
            value={value.municipio}
            onChange={(e) => onChange({ municipio: e.target.value })}
            required
            placeholder="Ej. Benito Juárez"
            className={inputClass}
          />
        )}
      </div>

      <div>
        <label className="block text-zinc-400 text-sm mb-1">Estado</label>
        {useLookup ? (
          <input type="text" value={value.state} readOnly className={readOnlyClass} />
        ) : (
          <input
            type="text"
            name="state"
            value={value.state}
            onChange={(e) => onChange({ state: e.target.value })}
            required
            placeholder="Ej. Ciudad de México"
            className={inputClass}
          />
        )}
      </div>

      {manual && lookup && (
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-accent hover:underline text-xs"
          >
            Volver a elegir colonia del catálogo
          </button>
        </div>
      )}
    </>
  )
}
