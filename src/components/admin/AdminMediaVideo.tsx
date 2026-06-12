'use client'

import { useEffect, useRef } from 'react'
import { Play, X } from 'lucide-react'

type Props = {
  url: string
  className?: string
  /** Vista miniatura en grid */
  variant?: 'thumb' | 'player'
}

/** Miniatura o reproductor con controles para la galería admin */
export function AdminMediaVideo({ url, className = '', variant = 'thumb' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v || variant !== 'thumb') return
    v.load()
  }, [url, variant])

  if (variant === 'player') {
    return (
      <video
        ref={ref}
        src={url}
        controls
        autoPlay
        playsInline
        preload="auto"
        className={className}
      />
    )
  }

  return (
    <div className={`relative w-full h-full bg-zinc-950 ${className}`}>
      <video
        ref={ref}
        src={url}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
        <span className="rounded-full bg-black/60 p-2">
          <Play className="h-5 w-5 text-white fill-white" />
        </span>
      </div>
    </div>
  )
}

type ModalProps = {
  url: string | null
  name?: string
  onClose: () => void
}

export function AdminVideoPreviewModal({ url, name, onClose }: ModalProps) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <p className="text-zinc-300 text-sm truncate pr-4">{name ?? 'Video'}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <AdminMediaVideo url={url} variant="player" className="w-full max-h-[75vh] bg-black" />
      </div>
    </div>
  )
}
