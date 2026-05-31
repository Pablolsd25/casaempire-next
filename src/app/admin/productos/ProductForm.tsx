'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Upload, X, Loader2, Plus, Images, Film } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/types'
import { uploadProductImage, deleteProductImage, validateImageFile } from '@/lib/utils/image-upload'
import MediaPicker from '@/components/admin/MediaPicker'

const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-48 bg-zinc-800 animate-pulse rounded-lg" /> },
)

interface Category { id: string; name: string }
interface Props { product?: Product; categories: Category[] }

/** Pequeño toggle estilo iOS */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-accent' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function ProductForm({ product, categories }: Props) {
  const router = useRouter()
  const isEdit = !!product

  const [form, setForm] = useState({
    name:             product?.name             ?? '',
    slug:             product?.slug             ?? '',
    description:      product?.description      ?? '',
    price:            String(product?.price            ?? ''),
    compare_at_price: String(product?.compare_at_price ?? ''),
    cost:             String(product?.cost             ?? ''),
    category_id:      product?.category_id      ?? '',
    tags:             (product?.tags ?? []).join(', '),
    is_active:        product?.is_active        ?? true,
    is_offer:         !!(product?.compare_at_price),
  })

  // ── Imágenes ──────────────────────────────────────────────────────────────
  const [images,       setImages]       = useState<string[]>(product?.images ?? [])
  const [videos,       setVideos]       = useState<string[]>(product?.videos ?? [])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [pickImages,   setPickImages]   = useState(false)
  const [pickVideos,   setPickVideos]   = useState(false)
  const anyInputRef   = useRef<HTMLInputElement>(null)   // sube a cualquier slot
  const replaceIdx    = useRef<number>(-1)               // -1 = añadir, ≥0 = reemplazar

  // ── Estado ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── Helpers ───────────────────────────────────────────────────────────────
  const slugify = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'name' && !isEdit ? { slug: slugify(value) } : {}),
    }))
  }

  // ── Upload (reemplazar slot o añadir) ─────────────────────────────────────
  const triggerUpload = (idx: number) => {
    replaceIdx.current = idx
    anyInputRef.current?.click()
  }

  const triggerAdd = () => {
    replaceIdx.current = -1
    anyInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setGalleryError('')
    const productId = product?.id ?? `new_${Date.now()}`

    if (replaceIdx.current >= 0) {
      // Reemplazar una imagen existente
      const file = files[0]
      try {
        validateImageFile(file)
      } catch (err: any) { setGalleryError(err.message); return }
      const idx = replaceIdx.current
      setUploadingIdx(idx)
      try {
        const url = await uploadProductImage(file, productId)
        setImages(prev => {
          const next = [...prev]; next[idx] = url; return next
        })
      } catch (err: any) { setGalleryError(err.message) }
      finally { setUploadingIdx(null); e.target.value = '' }
    } else {
      // Añadir nuevas imágenes
      setUploading(true)
      try {
        const newUrls: string[] = []
        for (let i = 0; i < files.length; i++) {
          validateImageFile(files[i])
          const url = await uploadProductImage(files[i], productId)
          newUrls.push(url)
        }
        setImages(prev => [...prev, ...newUrls])
      } catch (err: any) { setGalleryError(err.message) }
      finally { setUploading(false); e.target.value = '' }
    }
  }

  const removeImage = (idx: number) => {
    const url = images[idx]
    setImages(prev => prev.filter((_, i) => i !== idx))
    deleteProductImage(url).catch(() => {})
  }

  const moveToFirst = (idx: number) =>
    setImages(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)])

  // ── Galería: agregar desde el picker (evita duplicados) ───────────────────
  const addImagesFromGallery = (urls: string[]) =>
    setImages(prev => [...prev, ...urls.filter(u => !prev.includes(u))])

  const addVideosFromGallery = (urls: string[]) =>
    setVideos(prev => [...prev, ...urls.filter(u => !prev.includes(u))])

  const removeVideo = (idx: number) =>
    setVideos(prev => prev.filter((_, i) => i !== idx))

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body = {
      name:             form.name,
      slug:             form.slug,
      description:      form.description || null,
      price:            Number(form.price),
      compare_at_price: form.is_offer && form.compare_at_price ? Number(form.compare_at_price) : null,
      cost:             form.cost ? Number(form.cost) : null,
      category_id:      form.category_id || null,
      images,
      videos,
      tags:             form.tags.split(',').map(s => s.trim()).filter(Boolean),
      is_active:        form.is_active,
    }

    const url    = isEdit ? `/api/admin/products/${product!.id}` : '/api/admin/products'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar el producto')
      setLoading(false)
    } else {
      router.push('/admin/productos')
      router.refresh()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      {/* Input de archivo oculto (compartido) */}
      <input
        ref={anyInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 min-w-0">
          <Link href="/admin/productos" className="hover:text-white transition-colors">Productos</Link>
          <span>/</span>
          <span className="text-zinc-300 truncate max-w-[200px]">{form.name || 'Nuevo producto'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-1.5 text-sm border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="btn-accent px-5 py-1.5 rounded text-sm disabled:opacity-50 min-w-[100px] text-center">
            {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      {/* Errores */}
      {(error || galleryError) && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error || galleryError}
        </div>
      )}

      {/* ── Dos columnas ── */}
      <div className="flex gap-5 items-start">

        {/* ══ Columna principal ══ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* — Imágenes y videos — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-base">Imágenes</h2>
              <button type="button" onClick={() => setPickImages(true)}
                className="text-accent hover:text-accent/80 text-sm flex items-center gap-1.5 transition-colors">
                <Images className="h-4 w-4" /> Elegir de galería
              </button>
            </div>

            {/* Grid estilo Wix: primera imagen grande (2×2), resto pequeñas */}
            <div className="grid grid-cols-4 gap-2">
              {images.map((url, idx) => (
                <div
                  key={url + idx}
                  className={`relative group bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700
                    ${idx === 0 ? 'col-span-2 row-span-2' : 'aspect-square'}`}
                  style={idx === 0 ? { aspectRatio: '1/1' } : {}}
                >
                  {uploadingIdx === idx ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-accent animate-spin" />
                    </div>
                  ) : (
                    <img src={url} alt={`img-${idx}`} className="w-full h-full object-contain p-1" />
                  )}

                  {/* Overlay de acciones */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => triggerUpload(idx)}
                      title="Reemplazar"
                      className="bg-white/20 hover:bg-white/30 text-white rounded p-1.5 backdrop-blur-sm transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    {idx !== 0 && (
                      <button type="button" onClick={() => moveToFirst(idx)}
                        title="Poner como principal"
                        className="bg-accent/80 hover:bg-accent text-black rounded p-1.5 text-[10px] font-bold leading-none backdrop-blur-sm transition-colors">
                        ★
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(idx)}
                      title="Eliminar"
                      className="bg-red-600/80 hover:bg-red-600 text-white rounded p-1.5 backdrop-blur-sm transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  )}
                </div>
              ))}

              {/* Botón añadir */}
              <div
                onClick={uploading ? undefined : triggerAdd}
                className={`aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-accent
                  flex flex-col items-center justify-center cursor-pointer transition-colors
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                  ${images.length === 0 ? 'col-span-2 row-span-2' : ''}`}
                style={images.length === 0 ? { aspectRatio: '1/1' } : {}}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-accent animate-spin" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 text-zinc-500 group-hover:text-accent mb-1" />
                    <span className="text-zinc-600 text-xs">{images.length === 0 ? 'Añadir imagen' : ''}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* — Videos — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-base">Videos</h2>
              <button type="button" onClick={() => setPickVideos(true)}
                className="text-accent hover:text-accent/80 text-sm flex items-center gap-1.5 transition-colors">
                <Film className="h-4 w-4" /> Agregar video
              </button>
            </div>
            {videos.length === 0 ? (
              <p className="text-zinc-600 text-sm">Sin videos. Agrega desde la galería o pega una URL externa.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {videos.map((url, idx) => (
                  <div key={url + idx} className="relative group bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 aspect-video">
                    <video src={url} className="w-full h-full object-cover" muted />
                    <button type="button" onClick={() => removeVideo(idx)} title="Quitar"
                      className="absolute top-1.5 right-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* — Información del producto — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
            <h2 className="text-white font-semibold text-base">Información del producto</h2>

            <div className="border-t border-zinc-800 pt-4 space-y-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Información básica</p>

              {/* Nombre */}
              <div>
                <label className="block text-zinc-300 text-sm mb-1.5">Nombre</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  placeholder="Nombre del producto"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors" />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-zinc-300 text-sm mb-1.5">Descripción</label>
                <RichTextEditor
                  value={form.description}
                  onChange={val => setForm(prev => ({ ...prev, description: val }))}
                  placeholder="Describe el producto..."
                />
              </div>
            </div>
          </div>

          {/* — Precios — */}
          {(() => {
            const price = parseFloat(form.price) || 0
            const cost  = parseFloat(form.cost)  || 0
            const ganancia = price - cost
            const margen   = price > 0 ? Math.round((ganancia / price) * 100) : 0
            return (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                <h2 className="text-white font-semibold text-base">Precios</h2>

                {/* Precio */}
                <div>
                  <label className="block text-zinc-400 text-sm mb-1.5">Precio</label>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm select-none">$</span>
                    <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required
                      className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>

                {/* Oferta toggle */}
                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                  <span className="text-zinc-300 text-sm">Oferta</span>
                  <Toggle
                    checked={form.is_offer}
                    onChange={v => setForm(prev => ({ ...prev, is_offer: v, compare_at_price: v ? prev.compare_at_price : '' }))}
                  />
                </div>

                {/* Precio tachado — solo visible si oferta activa */}
                {form.is_offer && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-1.5">Precio antes (tachado)</label>
                    <div className="relative max-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm select-none">$</span>
                      <input name="compare_at_price" type="number" step="0.01" min="0"
                        value={form.compare_at_price} onChange={handleChange}
                        className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                  </div>
                )}

                {/* Costo + Ganancia + Margen */}
                <div className="border-t border-zinc-800 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Costo de la mercancía */}
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1.5">
                        Costo de la mercancía
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs select-none">$</span>
                        <input name="cost" type="number" step="0.01" min="0" value={form.cost} onChange={handleChange}
                          placeholder="0"
                          className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                      </div>
                    </div>

                    {/* Ganancia (solo lectura) */}
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1.5">Ganancia</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs select-none">$</span>
                        <div className={`w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-6 pr-2 py-2 text-sm ${ganancia >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>
                          {ganancia.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Margen (solo lectura) */}
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1.5">Margen</label>
                      <div className="flex items-center gap-1">
                        <div className={`flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm ${margen >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>
                          {margen}
                        </div>
                        <span className="text-zinc-500 text-sm font-medium">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* — Tags — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <h2 className="text-white font-semibold text-base mb-3">Etiquetas</h2>
            <input name="tags" value={form.tags} onChange={handleChange}
              placeholder="proteína, ganancia, mujer... (separadas por coma)"
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors" />
          </div>

        </div>

        {/* ══ Sidebar ══ */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* — Visibilidad — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 text-sm">Mostrar en la tienda</span>
              <Toggle
                checked={form.is_active}
                onChange={v => setForm(prev => ({ ...prev, is_active: v }))}
              />
            </div>
            <p className="text-zinc-600 text-xs">
              {form.is_active ? 'El producto es visible para los clientes.' : 'El producto está oculto en la tienda.'}
            </p>
          </div>

          {/* — Categorías — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Categorías</h3>
            <div className="space-y-2">
              {/* Opción "sin categoría" */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="category_id"
                  value=""
                  checked={form.category_id === ''}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 accent-accent"
                />
                <span className="text-zinc-400 text-sm group-hover:text-white transition-colors">Sin categoría</span>
              </label>
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="category_id"
                    value={c.id}
                    checked={form.category_id === c.id}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  <span className="text-zinc-400 text-sm group-hover:text-white transition-colors">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* — URL / Slug — */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-white font-semibold text-sm mb-2">URL del producto</h3>
            <p className="text-zinc-600 text-xs mb-2">/producto/<span className="text-zinc-400">{form.slug || '...'}</span></p>
            <input name="slug" value={form.slug} onChange={handleChange} required
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-400 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent font-mono transition-colors" />
          </div>

        </div>
      </div>

      {/* Pickers de galería */}
      <MediaPicker open={pickImages} onClose={() => setPickImages(false)}
        onSelect={addImagesFromGallery} accept="image" multiple />
      <MediaPicker open={pickVideos} onClose={() => setPickVideos(false)}
        onSelect={addVideosFromGallery} accept="video" multiple />
    </form>
  )
}
