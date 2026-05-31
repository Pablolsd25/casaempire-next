'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { Upload, X, Eye, EyeOff, ImageIcon } from 'lucide-react'
import 'quill/dist/quill.snow.css'
import './rich-text-editor.css'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  name?: string
  defaultValue?: string
}

// ── Procesar HTML entrante (Quill blots) ──────────────────────────────────────
function processIncoming(html: string): string {
  if (!html) return ''
  html = html.replace(/<img(?!\s[^>]*loading=)/gi, '<img loading="lazy"')
  html = html
    .replace(/<p style="text-align:\s*center;?">/gi, '<p class="ql-align-center">')
    .replace(/<p style="text-align:\s*right;?">/gi, '<p class="ql-align-right">')
    .replace(/<p style="text-align:\s*justify;?">/gi, '<p class="ql-align-justify">')
  html = html.replace(
    /<div[^>]*>\s*<video[^>]*>\s*<source\s+src="([^"]+)"[^>]*>[\s\S]*?<\/video>\s*<\/div>/gi,
    (_, url) => `<div class="ql-video-block" data-video-url="${url}"></div>`,
  )
  html = html.replace(
    /<video[^>]*>\s*<source\s+src="([^"]+)"[^>]*>[\s\S]*?<\/video>/gi,
    (_, url) => `<div class="ql-video-block" data-video-url="${url}"></div>`,
  )
  return html
}

// ── Procesar HTML saliente (para guardar) ─────────────────────────────────────
function processOutgoing(html: string): string {
  let out = html
  out = out.replace(
    /<div[^>]*class="ql-video-block"[^>]*>[\s\S]*?<\/div>/gi,
    (match) => {
      const url = match.match(/data-video-url="([^"]+)"/)?.[1] || ''
      if (!url) return match
      return `\n<div style="text-align:center;margin:30px 0">\n  <video controls preload="none" width="700" height="394" style="max-width:100%;height:auto;border-radius:8px">\n    <source src="${url}" type="video/mp4">\n  </video>\n</div>\n`
    },
  )
  out = out
    .replace(/<p class="ql-align-center">/g, '<p style="text-align:center;">')
    .replace(/<p class="ql-align-right">/g, '<p style="text-align:right;">')
    .replace(/<p class="ql-align-justify">/g, '<p style="text-align:justify;">')
  out = out.replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy"')
  out = out.replace(/<p>\s*<\/p>/g, '')
  return out
}

// ── Previsualizar videos ───────────────────────────────────────────────────────
function buildPreviewHtml(html: string): string {
  return html.replace(
    /<div[^>]*class="ql-video-block"[^>]*>[\s\S]*?<\/div>/gi,
    (match) => {
      const url = match.match(/data-video-url="([^"]+)"/)?.[1] || ''
      if (!url) return match
      return `<div style="text-align:center;margin:24px 0"><video controls preload="metadata" playsinline style="max-width:100%;width:700px;height:auto;border-radius:12px;background:#000"><source src="${url}" type="video/mp4"></video></div>`
    },
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  name,
  defaultValue,
}: RichTextEditorProps) {
  // div donde montamos Quill
  const editorDivRef  = useRef<HTMLDivElement>(null)
  const quillRef      = useRef<any>(null)
  const isInternal    = useRef(false)
  const onChangeRef   = useRef(onChange)
  onChangeRef.current = onChange

  // Estado UI
  const [showHtml,        setShowHtml]        = useState(false)
  const [showPreview,     setShowPreview]      = useState(false)
  const [showVideoModal,  setShowVideoModal]   = useState(false)
  const [videoUrl,        setVideoUrl]         = useState('')
  const [uploadingVideo,  setUploadingVideo]   = useState(false)
  const [videoTab,        setVideoTab]         = useState<'upload' | 'url'>('upload')
  const [showImageModal,  setShowImageModal]   = useState(false)
  const [imageUrl,        setImageUrl]         = useState('')
  const [uploadingImage,  setUploadingImage]   = useState(false)
  const videoFileRef  = useRef<HTMLInputElement>(null)
  const imageFileRef  = useRef<HTMLInputElement>(null)

  // HTML sincronizado (para HTML-mode textarea y para la previsualización)
  const [rawHtml, setRawHtml] = useState(processIncoming(defaultValue ?? value ?? ''))

  // Ref estable para abrir el modal de imagen (usado por el toolbar handler)
  const openImageRef = useRef<() => void>(() => {
    setShowImageModal(true)
    setImageUrl('')
  })

  // ── Inicializar Quill (solo una vez en el cliente) ──────────────────────
  useEffect(() => {
    if (!editorDivRef.current || quillRef.current) return
    let mounted = true

    ;(async () => {
      const { default: Quill } = await import('quill') as any
      if (!mounted || !editorDivRef.current) return

      // Registrar VideoBlot una sola vez (flag en la clase)
      if (!(Quill as any).__ceVideoRegistered) {
        try {
          const BlockEmbed = Quill.import('blots/block/embed') as any
          class VideoBlot extends BlockEmbed {
            static create(url: string) {
              const node = super.create() as HTMLDivElement
              node.setAttribute('contenteditable', 'false')
              node.setAttribute('data-video-url', url)
              node.style.textAlign = 'center'
              node.style.margin = '20px 0'
              const video = document.createElement('video')
              video.setAttribute('controls', '')
              video.setAttribute('preload', 'metadata')
              video.setAttribute('playsinline', '')
              video.style.maxWidth = '100%'
              video.style.width = '100%'
              video.style.borderRadius = '8px'
              video.style.display = 'block'
              video.style.margin = '0 auto'
              video.style.background = '#000'
              const source = document.createElement('source')
              source.setAttribute('src', url)
              source.setAttribute('type', 'video/mp4')
              video.appendChild(source)
              node.appendChild(video)
              return node
            }
            static value(node: HTMLElement) {
              return node.getAttribute('data-video-url') || ''
            }
          }
          VideoBlot.blotName  = 'video-block'
          VideoBlot.tagName   = 'DIV'
          VideoBlot.className = 'ql-video-block'
          Quill.register(VideoBlot, true)
        } catch (_) { /* ya registrado */ }
        ;(Quill as any).__ceVideoRegistered = true
      }

      const quill = new Quill(editorDivRef.current!, {
        theme: 'snow',
        placeholder,
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ color: [] }, { background: [] }],
              [{ align: [] }],
              ['link', 'image'],
              ['clean'],
            ],
            handlers: {
              image: () => openImageRef.current(),
            },
          },
        },
        formats: [
          'header', 'bold', 'italic', 'underline', 'strike',
          'list', 'link', 'image', 'color', 'background', 'align', 'video-block',
        ],
      })

      quillRef.current = quill

      // Inyectar contenido inicial
      const initial = processIncoming(value ?? defaultValue ?? '')
      if (initial) {
        quill.clipboard.dangerouslyPasteHTML(initial)
      }

      // Escuchar cambios
      quill.on('text-change', () => {
        const html = quill.root.innerHTML
        setRawHtml(html)
        isInternal.current = true
        onChangeRef.current?.(processOutgoing(html))
        isInternal.current = false
      })
    })()

    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sincronizar valor externo → Quill ──────────────────────────────────
  useEffect(() => {
    if (value === undefined || !quillRef.current || isInternal.current) return
    const processed = processIncoming(value)
    if (processed !== quillRef.current.root.innerHTML) {
      quillRef.current.clipboard.dangerouslyPasteHTML(processed)
      setRawHtml(quillRef.current.root.innerHTML)
    }
  }, [value])

  const hasVideos = useMemo(() => /ql-video-block|data-video-url/i.test(rawHtml), [rawHtml])

  // ── Insertar video ──────────────────────────────────────────────────────
  const insertVideo = useCallback((url: string) => {
    const quill = quillRef.current
    if (quill) {
      const range = quill.getSelection(true)
      const idx   = range ? range.index : quill.getLength() - 1
      quill.insertText(idx,     '\n', 'user')
      quill.insertEmbed(idx + 1, 'video-block', url, 'user')
      quill.insertText(idx + 2, '\n', 'user')
      quill.setSelection(idx + 3)
    }
    setShowVideoModal(false)
    setVideoUrl('')
  }, [])

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const ext  = file.name.split('.').pop()
      const path = `videos/desc_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false })
      if (error) throw new Error(error.message)
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      insertVideo(publicUrl)
    } catch (err: any) {
      alert('Error subiendo video: ' + (err.message ?? 'desconocido'))
    } finally {
      setUploadingVideo(false)
      e.target.value = ''
    }
  }

  // ── Insertar imagen ─────────────────────────────────────────────────────
  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current
    if (quill) {
      const range = quill.getSelection(true)
      const idx   = range ? range.index : quill.getLength() - 1
      quill.insertEmbed(idx, 'image', url, 'user')
      quill.setSelection(idx + 1)
    }
    setShowImageModal(false)
    setImageUrl('')
  }, [])

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Máx 5 MB'); return }
    setUploadingImage(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const ext  = file.name.split('.').pop()
      const path = `products/description/desc_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false })
      if (error) throw new Error(error.message)
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      insertImage(publicUrl)
    } catch (err: any) {
      alert('Error subiendo imagen: ' + (err.message ?? 'desconocido'))
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  // ── Modo HTML manual ────────────────────────────────────────────────────
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw    = e.target.value
    const forEditor = raw.replace(
      /<div[^>]*>\s*<video[^>]*>\s*<source\s+src="([^"]+)"[^>]*>[\s\S]*?<\/video>\s*<\/div>/gi,
      (_, url) => `<div class="ql-video-block" data-video-url="${url}"></div>`,
    )
    setRawHtml(forEditor)
    isInternal.current = true
    onChangeRef.current?.(raw)
    isInternal.current = false
    // Sincronizar también al editor Quill si existe
    if (quillRef.current) {
      quillRef.current.clipboard.dangerouslyPasteHTML(forEditor)
    }
  }

  // Mostrar HTML limpio en el textarea
  const displayHtml = processOutgoing(rawHtml)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="rich-text-editor-wrapper">
      {/* Barra superior */}
      <div className="mb-2 flex justify-between items-center gap-2 flex-wrap">
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowVideoModal(true)}
            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors flex items-center gap-1.5 font-medium">
            <Upload className="h-3 w-3" />
            Insertar Video
          </button>
          {hasVideos && (
            <button type="button" onClick={() => setShowPreview(v => !v)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 font-medium ${
                showPreview
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}>
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPreview ? 'Ocultar preview' : 'Vista previa'}
            </button>
          )}
        </div>
        <button type="button" onClick={() => setShowHtml(v => !v)}
          className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded border border-zinc-700 transition-colors font-medium">
          {showHtml ? '📝 Vista visual' : '💻 Ver HTML'}
        </button>
      </div>

      {/* Editor / HTML textarea */}
      {showHtml ? (
        <textarea value={displayHtml} onChange={handleHtmlChange}
          className="w-full min-h-[400px] p-4 bg-zinc-950 border border-zinc-700 rounded text-zinc-300 font-mono text-xs focus:outline-none focus:border-accent"
          placeholder="Código HTML..." spellCheck={false} />
      ) : (
        /* El div donde Quill se monta — siempre en el DOM para no perder el estado */
        <div ref={editorDivRef} className="rich-text-editor" />
      )}

      {/* Vista previa de videos */}
      {!showHtml && hasVideos && showPreview && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Vista previa</span>
            <div className="h-px flex-1 bg-gradient-to-l from-accent/30 to-transparent" />
          </div>
          <div className="border border-zinc-700 rounded-xl bg-zinc-950 p-6 product-description text-zinc-300"
            dangerouslySetInnerHTML={{ __html: buildPreviewHtml(rawHtml) }}
            style={{ maxWidth: '100%', lineHeight: 1.75 }} />
        </div>
      )}

      {name && <input type="hidden" name={name} value={displayHtml} />}

      {/* ── Modal Video ── */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowVideoModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-lg w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Insertar Video</h3>
              <button type="button" onClick={() => setShowVideoModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-1 mb-5 border-b border-zinc-700">
              {(['upload', 'url'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setVideoTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    videoTab === tab ? 'border-accent text-accent' : 'border-transparent text-zinc-400 hover:text-white'
                  }`}>
                  {tab === 'upload' ? 'Subir archivo' : 'URL'}
                </button>
              ))}
            </div>
            {videoTab === 'upload' && (
              <div className="text-center py-8">
                <input ref={videoFileRef} type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
                {uploadingVideo ? (
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-zinc-400 text-sm">Subiendo video...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                    <button type="button" onClick={() => videoFileRef.current?.click()}
                      className="px-5 py-2 bg-accent text-black font-semibold rounded-lg text-sm hover:bg-accent/90 transition-colors">
                      Seleccionar archivo
                    </button>
                    <p className="text-zinc-500 text-xs mt-2">MP4, WebM — máx 50 MB</p>
                  </>
                )}
              </div>
            )}
            {videoTab === 'url' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">URL del video</label>
                <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/video.mp4"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-accent" />
                <button type="button" onClick={() => videoUrl.trim() && insertVideo(videoUrl.trim())}
                  disabled={!videoUrl.trim()}
                  className="w-full py-2 bg-accent text-black font-semibold rounded-lg text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors">
                  Insertar Video
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Imagen ── */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowImageModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Insertar Imagen</h3>
              <button type="button" onClick={() => setShowImageModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center">
                <input ref={imageFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageFile} className="hidden" />
                {uploadingImage ? (
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-zinc-400 text-sm">Subiendo imagen...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                    <button type="button" onClick={() => imageFileRef.current?.click()}
                      className="px-5 py-2 bg-accent text-black font-semibold rounded-lg text-sm hover:bg-accent/90 transition-colors">
                      Subir desde el equipo
                    </button>
                    <p className="text-zinc-500 text-xs mt-2">JPG, PNG, WebP, GIF — máx 5 MB</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-zinc-700" />
                <span className="text-xs text-zinc-500">O</span>
                <div className="flex-1 border-t border-zinc-700" />
              </div>
              <div className="flex gap-2">
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-accent" />
                <button type="button" onClick={() => imageUrl.trim() && insertImage(imageUrl.trim())}
                  disabled={!imageUrl.trim()}
                  className="px-4 py-2 bg-accent text-black font-semibold text-sm rounded disabled:opacity-40 hover:bg-accent/90 transition-colors">
                  Insertar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
