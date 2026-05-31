'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload, Loader2, Check, Link2 } from 'lucide-react'
import type { MediaItem } from '@/types'
import { uploadMediaFile } from '@/lib/utils/image-upload'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (urls: string[]) => void
  /** Filtra el tipo mostrado/aceptado */
  accept?: 'image' | 'video' | 'all'
  /** Permite seleccionar varios a la vez */
  multiple?: boolean
}

export default function MediaPicker({ open, onClose, onSelect, accept = 'image', multiple = false }: Props) {
  const [items, setItems]       = useState<MediaItem[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) setItems(await res.json())
      else setError('No se pudo cargar la galería.')
    } catch {
      setError('No se pudo cargar la galería.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) { setSelected(new Set()); setExternalUrl(''); fetchMedia() }
  }, [open, fetchMedia])

  if (!open) return null

  const visible = items.filter(i => accept === 'all' ? true : i.kind === accept)

  const toggle = (url: string) => {
    setSelected(prev => {
      const next = new Set(multiple ? prev : [])
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const urls: string[] = []
      for (let i = 0; i < files.length; i++) {
        urls.push(await uploadMediaFile(files[i]))
      }
      await fetchMedia()
      setSelected(prev => {
        const next = new Set(multiple ? prev : [])
        urls.forEach(u => next.add(u))
        return next
      })
    } catch (err: any) {
      setError(err.message ?? 'Error al subir.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirm = () => {
    if (selected.size === 0) return
    onSelect(Array.from(selected))
    onClose()
  }

  const addExternal = () => {
    const u = externalUrl.trim()
    if (!u) return
    onSelect([u])
    setExternalUrl('')
    onClose()
  }

  const acceptAttr = accept === 'video'
    ? 'video/mp4,video/webm,video/quicktime'
    : accept === 'all'
      ? 'image/*,video/mp4,video/webm,video/quicktime'
      : 'image/jpeg,image/png,image/webp,image/gif'

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-white font-bold text-lg">Galería de medios</h3>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept={acceptAttr} multiple={multiple} onChange={handleUpload} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-accent px-3.5 py-1.5 rounded text-sm flex items-center gap-1.5 disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Subir
            </button>
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && <div className="mx-5 mt-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded p-2.5 text-sm">{error}</div>}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-16">No hay archivos. Sube el primero.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {visible.map(item => {
                const isSel = selected.has(item.url)
                return (
                  <button type="button" key={item.path} onClick={() => toggle(item.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors bg-zinc-800
                      ${isSel ? 'border-accent' : 'border-transparent hover:border-zinc-600'}`}>
                    {item.kind === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    )}
                    {isSel && (
                      <span className="absolute top-1 right-1 bg-accent text-black rounded-full p-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {item.kind === 'video' && (
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">Video</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-3 space-y-3">
          {/* URL externa (útil para videos alojados fuera) */}
          {accept !== 'image' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                  placeholder="O pega una URL externa (https://...)"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <button type="button" onClick={addExternal} disabled={!externalUrl.trim()}
                className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap">
                Usar URL
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={confirm} disabled={selected.size === 0}
                className="btn-accent px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {multiple ? `Agregar (${selected.size})` : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
