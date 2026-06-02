'use client'

import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'

type Props = {
  title: string
  description: string
  videoSrc: string
  videoSrcMobile?: string
  loading?: boolean
  uploading?: boolean
  saved?: boolean
  error?: string
  onUpload: (file: File) => Promise<void>
}

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'

export default function HomeVideoUpload({
  title,
  description,
  videoSrc,
  videoSrcMobile,
  loading = false,
  uploading = false,
  saved = false,
  error = '',
  onUpload,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await onUpload(file)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-white font-semibold text-lg mb-1">{title}</h2>
        <p className="text-zinc-500 text-sm">{description}</p>
      </div>

      <div className="rounded overflow-hidden border border-zinc-800 aspect-video bg-black relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Cargando...
          </div>
        ) : (
          <video
            key={videoSrc}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            {videoSrcMobile && videoSrcMobile !== videoSrc && (
              <source src={videoSrcMobile} type="video/mp4" media="(max-width: 767px)" />
            )}
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <span className="absolute bottom-2 left-2 text-xs text-zinc-400 bg-black/60 px-2 py-0.5 rounded">
          Vista previa
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={VIDEO_ACCEPT}
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || loading}
          className="btn-accent px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'Subiendo...' : 'Subir video'}
        </button>
        {saved && <span className="text-green-400 text-sm">Guardado ✓</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      <p className="text-zinc-600 text-xs">
        Formatos: MP4, WebM o MOV. Máximo 50 MB. El video se guarda en la galería del sitio.
      </p>
    </div>
  )
}
