'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Product } from '@/types'

interface Category { id: string; name: string }
interface Props { product?: Product; categories: Category[] }

export default function ProductForm({ product, categories }: Props) {
  const router  = useRouter()
  const isEdit  = !!product

  const [form, setForm] = useState({
    name:             product?.name             ?? '',
    slug:             product?.slug             ?? '',
    description:      product?.description      ?? '',
    price:            product?.price            ?? '',
    compare_at_price: product?.compare_at_price ?? '',
    stock:            product?.stock            ?? 0,
    category_id:      product?.category_id      ?? '',
    tags:             (product?.tags ?? []).join(', '),
    is_active:        product?.is_active        ?? true,
  })

  // Imágenes como array de strings
  const [images,   setImages]   = useState<string[]>(product?.images ?? [])
  const [newImgUrl, setNewImgUrl] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      ...(name === 'name' && !isEdit ? { slug: slugify(value) } : {}),
    }))
  }

  // ---- gestión de imágenes ----
  const addImage = () => {
    const url = newImgUrl.trim()
    if (!url) return
    setImages(prev => [...prev, url])
    setNewImgUrl('')
  }

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx))

  const moveToFirst = (idx: number) =>
    setImages(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)])

  const handleImgKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addImage() }
  }

  // ---- submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body = {
      name:             form.name,
      slug:             form.slug,
      description:      form.description || null,
      price:            Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      stock:            Number(form.stock),
      category_id:      form.category_id || null,
      images,
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
    } else {
      router.push('/admin/productos')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded p-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Nombre *</label>
          <input name="name" value={form.name} onChange={handleChange} required
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {/* Slug */}
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Slug (URL) *</label>
          <input name="slug" value={form.slug} onChange={handleChange} required
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-400 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono" />
        </div>

        {/* Precio */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Precio (MXN) *</label>
          <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {/* Precio comparación */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Precio antes (tachado)</label>
          <input name="compare_at_price" type="number" step="0.01" min="0" value={form.compare_at_price} onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Stock *</label>
          <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Categoría</label>
          <select name="category_id" value={form.category_id} onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent">
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Descripción */}
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">Descripción</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4}
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent resize-y" />
        </div>

        {/* ── IMÁGENES (visual) ── */}
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-3">
            Imágenes del producto
          </label>

          {/* Grid de previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 aspect-square">
                  {/* Preview */}
                  <img
                    src={url}
                    alt={`imagen ${idx + 1}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ''
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />

                  {/* Badge principal */}
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-accent text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  )}

                  {/* Overlay con acciones */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => moveToFirst(idx)}
                        title="Poner como principal"
                        className="bg-accent text-black text-xs font-bold px-2 py-1 rounded hover:bg-white transition-colors"
                      >
                        ★ Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      title="Eliminar imagen"
                      className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded hover:bg-red-500 transition-colors"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input para agregar URL */}
          <div className="flex gap-2">
            <input
              type="url"
              value={newImgUrl}
              onChange={e => setNewImgUrl(e.target.value)}
              onKeyDown={handleImgKeyDown}
              placeholder="https://... pega la URL de la imagen"
              className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addImage}
              disabled={!newImgUrl.trim()}
              className="btn-accent px-4 py-2 rounded text-sm disabled:opacity-40"
            >
              + Agregar
            </button>
          </div>
          {images.length === 0 && (
            <p className="text-zinc-600 text-xs mt-2">Sin imágenes. Pega una URL y haz clic en Agregar.</p>
          )}
        </div>

        {/* Tags */}
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs uppercase tracking-wide mb-1">
            Tags <span className="text-zinc-600">(separados por coma)</span>
          </label>
          <input name="tags" value={form.tags} onChange={handleChange}
            placeholder="proteína, ganancia, mujer..."
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {/* Activo */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
              className="w-4 h-4 accent-accent" />
            <span className="text-zinc-300 text-sm">Producto activo (visible en la tienda)</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-accent px-6 py-2.5 rounded text-sm disabled:opacity-50">
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 rounded text-sm border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
