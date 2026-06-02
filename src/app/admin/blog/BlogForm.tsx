'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Upload, Loader2 } from 'lucide-react'
import { uploadProductImage } from '@/lib/utils/image-upload'
import type { BlogPost } from '@/types'

const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-48 bg-zinc-900 animate-pulse rounded" /> },
)

interface Props { post?: BlogPost }

export default function BlogForm({ post }: Props) {
  const router  = useRouter()
  const isEdit  = !!post

  const [form, setForm] = useState({
    title:        post?.title        ?? '',
    slug:         post?.slug         ?? '',
    excerpt:      post?.excerpt      ?? '',
    cover_image:  post?.cover_image  ?? '',
    is_published: post?.is_published ?? false,
    content:      post?.content      ?? '',
  })

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [editorOpen,    setEditorOpen]    = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const slugify = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm(prev => ({
      ...prev,
      [name]: val,
      ...(name === 'title' && !isEdit ? { slug: slugify(value) } : {}),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const wasUnpublished = !post?.is_published
    const body = {
      ...form,
      excerpt:      form.excerpt      || null,
      cover_image:  form.cover_image  || null,
      set_published_at: form.is_published && wasUnpublished,
    }

    const url    = isEdit ? `/api/admin/blog/${post!.id}` : '/api/admin/blog'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar el artículo')
    } else {
      router.push('/admin/blog')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Información básica ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Información básica</h2>

        {/* Título */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Título *
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="Ej: Los mejores suplementos para mujeres"
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Slug (URL) *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 text-xs font-mono">/blog/</span>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              placeholder="los-mejores-suplementos"
              className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Extracto */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Extracto <span className="text-zinc-600 normal-case font-normal">(resumen corto, aparece en listas)</span>
          </label>
          <textarea
            name="excerpt"
            value={form.excerpt}
            onChange={handleChange}
            rows={2}
            placeholder="Breve descripción del artículo..."
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* Imagen de portada */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Imagen de portada
          </label>
          <div className="flex gap-2">
            <input
              name="cover_image"
              value={form.cover_image}
              onChange={handleChange}
              placeholder="https://... o sube una imagen"
              className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Subir
            </button>
          </div>
          {uploadError && (
            <p className="text-red-400 text-xs mt-1">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploadError('')
              setUploading(true)
              try {
                const url = await uploadProductImage(file, `blog_${Date.now()}`, 'products')
                setForm(prev => ({ ...prev, cover_image: url }))
              } catch (err: any) {
                setUploadError(err.message)
              } finally {
                setUploading(false)
                e.target.value = ''
              }
            }}
          />
          {form.cover_image && (
            <div className="mt-2 relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.cover_image}
                alt="Portada"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Publicado */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-zinc-300 text-sm">Publicado (visible en el blog)</span>
          </label>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <button
          type="button"
          onClick={() => setEditorOpen(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
            Contenido{' '}
            <span className="text-zinc-600 normal-case font-normal">(Editor con formato)</span>
          </h2>
          <span className="text-zinc-400 text-xl leading-none">{editorOpen ? '∧' : '∨'}</span>
        </button>

        {!editorOpen && (
          <div className="mt-4 border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center">
            <p className="text-zinc-500 text-sm mb-3">
              {form.content
                ? `Contenido con ${form.content.replace(/<[^>]+>/g, '').length} caracteres`
                : 'Sin contenido aún'}
            </p>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-sm transition-colors"
            >
              ✏️ Abrir editor
            </button>
          </div>
        )}

        {editorOpen && (
          <div className="mt-4">
            <RichTextEditor
              value={form.content}
              onChange={val => setForm(prev => ({ ...prev, content: val }))}
              placeholder="Escribe el contenido del artículo..."
            />
          </div>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-accent px-6 py-2.5 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded text-sm border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
