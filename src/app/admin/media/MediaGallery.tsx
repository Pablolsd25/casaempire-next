'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Loader2, Trash2, Copy, Check } from 'lucide-react'
import type { MediaItem } from '@/types'
import { uploadMediaFile } from '@/lib/utils/image-upload'
import { AdminMediaVideo, AdminVideoPreviewModal } from '@/components/admin/AdminMediaVideo'

type Filter = 'all' | 'image' | 'video'

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaGallery() {
  const [items, setItems]     = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter]   = useState<Filter>('all')
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState<string | null>(null)
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
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

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      for (let i = 0; i < files.length; i++) await uploadMediaFile(files[i])
      await fetchMedia()
    } catch (err: any) {
      setError(err.message ?? 'Error al subir.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return
    setItems(prev => prev.filter(i => i.path !== item.path))
    await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path }),
    })
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(c => (c === url ? null : c)), 1500)
  }

  const visible = items.filter(i => filter === 'all' ? true : i.kind === filter)
  const counts = {
    all:   items.length,
    image: items.filter(i => i.kind === 'image').length,
    video: items.filter(i => i.kind === 'video').length,
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['all', 'image', 'video'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filter === f ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}>
              {f === 'all' ? 'Todos' : f === 'image' ? 'Imágenes' : 'Videos'}
              <span className="ml-1.5 text-xs text-zinc-500">{counts[f]}</span>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" multiple
          accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleUpload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-accent px-4 py-2 rounded text-sm flex items-center gap-1.5 disabled:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir archivos
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg py-20 text-center text-zinc-600 text-sm">
          No hay archivos en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visible.map(item => (
            <div key={item.path}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="aspect-square bg-zinc-800">
                {item.kind === 'video' ? (
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="w-full h-full cursor-pointer"
                    title="Reproducir video"
                  >
                    <AdminMediaVideo url={item.url} />
                  </button>
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>

              {/* Overlay acciones */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyUrl(item.url)} title="Copiar URL"
                  className="bg-black/70 hover:bg-black text-white rounded p-1.5 backdrop-blur-sm">
                  {copied === item.url ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => handleDelete(item)} title="Eliminar"
                  className="bg-red-600/80 hover:bg-red-600 text-white rounded p-1.5 backdrop-blur-sm">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {item.kind === 'video' && (
                <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">Video</span>
              )}

              <div className="px-2 py-1.5">
                <p className="text-zinc-300 text-xs truncate" title={item.name}>{item.name}</p>
                <p className="text-zinc-600 text-[10px]">{item.folder}{item.size ? ` · ${formatSize(item.size)}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminVideoPreviewModal
        url={preview?.url ?? null}
        name={preview?.name}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}
