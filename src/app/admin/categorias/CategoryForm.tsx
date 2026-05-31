'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Plus, ImagePlus, Trash2, GripVertical } from 'lucide-react'
import type { Category } from '@/types'
import MediaPicker from '@/components/admin/MediaPicker'
import ProductPicker, { type PickableProduct } from '@/components/admin/ProductPicker'

interface Props {
  category?: Category
  /** Productos ya asignados a esta categoría (solo en edición) */
  initialProducts?: PickableProduct[]
  /** Para mostrar de qué categoría se mueve un producto */
  categories?: { id: string; name: string }[]
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function CategoryForm({ category, initialProducts = [], categories = [] }: Props) {
  const router = useRouter()
  const [id, setId] = useState<string | null>(category?.id ?? null)
  const isEdit = !!id

  const [form, setForm] = useState({
    name:        category?.name ?? '',
    slug:        category?.slug ?? '',
    description: category?.description ?? '',
    image_url:   category?.image_url ?? '',
  })
  const [products, setProducts] = useState<PickableProduct[]>(initialProducts)

  const [pickImage, setPickImage]     = useState(false)
  const [pickProducts, setPickProducts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const catNameById = (cid: string | null) =>
    cid && cid !== id ? (categories.find(c => c.id === cid)?.name ?? null) : null

  // Guarda los campos de la categoría (crea o actualiza). Devuelve el id.
  const persistCategory = async (): Promise<string | null> => {
    const body = {
      name:        form.name.trim(),
      slug:        form.slug || slugify(form.name),
      description: form.description || null,
      image_url:   form.image_url || null,
    }
    const url    = id ? `/api/admin/categories/${id}` : '/api/admin/categories'
    const method = id ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al guardar la categoría.')
      return null
    }
    const data = await res.json()
    return data.id as string
  }

  // Asegura que exista la categoría (para poder asignar productos en modo "nuevo")
  const ensureCategoryId = async (): Promise<string | null> => {
    if (id) return id
    if (!form.name.trim()) {
      setError('Escribe un nombre para la categoría antes de agregar productos.')
      return null
    }
    setError('')
    const newId = await persistCategory()
    if (newId) {
      setId(newId)
      window.history.replaceState(null, '', `/admin/categorias/${newId}`)
    }
    return newId
  }

  const handleAddProducts = async (picked: PickableProduct[]) => {
    const cid = await ensureCategoryId()
    if (!cid) return
    const ids = picked.map(p => p.id)
    const res = await fetch(`/api/admin/categories/${cid}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add: ids }),
    })
    if (!res.ok) { setError('No se pudieron agregar los productos.'); return }
    setProducts(prev => {
      const existing = new Set(prev.map(p => p.id))
      return [...prev, ...picked.filter(p => !existing.has(p.id)).map(p => ({ ...p, category_id: cid }))]
    })
  }

  const handleRemoveProduct = async (pid: string) => {
    if (id) {
      await fetch(`/api/admin/categories/${id}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: [pid] }),
      })
    }
    setProducts(prev => prev.filter(p => p.id !== pid))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true)
    setError('')
    const savedId = await persistCategory()
    setLoading(false)
    if (savedId) {
      router.push('/admin/categorias')
      router.refresh()
    }
  }

  return (
    <div>
      {/* Header sticky */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/admin/categorias" className="hover:text-white transition-colors">Categorías</Link>
            <span>/</span>
            <span className="text-zinc-300 truncate max-w-[220px]">{form.name || 'Nueva categoría'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => router.push('/admin/categorias')}
            className="px-4 py-1.5 text-sm border border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={loading}
            className="btn-accent px-5 py-1.5 rounded text-sm disabled:opacity-50 min-w-[100px] text-center">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Título editable */}
      <input
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: isEdit ? p.slug : slugify(e.target.value) }))}
        placeholder="Nombre de la categoría"
        className="w-full bg-transparent text-white font-display font-bold text-3xl uppercase tracking-wide mb-6 focus:outline-none placeholder:text-zinc-700 border-b border-transparent focus:border-zinc-700 transition-colors pb-1"
      />

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="flex gap-5 items-start">
        {/* ══ Columna principal: productos en la categoría ══ */}
        <div className="flex-1 min-w-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-base">
                Productos en la categoría <span className="text-zinc-500">{products.length}</span>
              </h2>
              {products.length > 0 && (
                <button type="button" onClick={() => setPickProducts(true)}
                  className="text-accent hover:text-accent/80 text-sm flex items-center gap-1.5 transition-colors">
                  <Plus className="h-4 w-4" /> Agregar productos
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-white font-medium mb-1">Comienza agregando productos a tu categoría</p>
                <p className="text-zinc-500 text-sm mb-5">Los productos asignados aparecerán aquí.</p>
                <button type="button" onClick={() => setPickProducts(true)}
                  className="btn-accent px-5 py-2.5 rounded text-sm inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Agregar productos
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 -mx-1">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-1 py-2.5 group">
                    <GripVertical className="h-4 w-4 text-zinc-700 flex-shrink-0" />
                    <div className="w-11 h-11 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{p.name}</p>
                      <p className="text-zinc-500 text-xs">${Number(p.price).toLocaleString('es-MX')}</p>
                    </div>
                    {!p.is_active && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Oculto</span>}
                    <button type="button" onClick={() => handleRemoveProduct(p.id)} title="Quitar de la categoría"
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ Sidebar ══ */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Información */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Información de la categoría</h3>

            <div>
              <label className="block text-zinc-400 text-xs mb-1.5">Nombre de la categoría</label>
              <input value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: isEdit ? p.slug : slugify(e.target.value) }))}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs mb-1.5">Imagen de la categoría</label>
              {form.image_url ? (
                <div className="relative group rounded-lg overflow-hidden border border-zinc-700 aspect-video bg-zinc-800">
                  <img src={form.image_url} alt="cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => setPickImage(true)}
                      className="bg-white/20 hover:bg-white/30 text-white rounded px-2.5 py-1.5 text-xs backdrop-blur-sm transition-colors">
                      Cambiar
                    </button>
                    <button type="button" onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                      className="bg-red-600/80 hover:bg-red-600 text-white rounded p-1.5 backdrop-blur-sm transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPickImage(true)}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-accent flex flex-col items-center justify-center text-zinc-500 hover:text-accent transition-colors">
                  <ImagePlus className="h-6 w-6 mb-1" />
                  <span className="text-xs">Agregar imagen</span>
                </button>
              )}
            </div>
          </div>

          {/* Marketing y SEO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Marketing y SEO</h3>

            <div>
              <label className="block text-zinc-400 text-xs mb-1.5">URL de la categoría</label>
              <p className="text-zinc-600 text-xs mb-1.5">/categoria/<span className="text-zinc-400">{form.slug || '...'}</span></p>
              <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: slugify(e.target.value) }))}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-400 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent" />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs mb-1.5">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={4} placeholder="Describe la categoría..."
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Pickers */}
      <MediaPicker open={pickImage} onClose={() => setPickImage(false)} accept="image"
        onSelect={urls => urls[0] && setForm(p => ({ ...p, image_url: urls[0] }))} />
      <ProductPicker open={pickProducts} onClose={() => setPickProducts(false)}
        onConfirm={handleAddProducts}
        excludeIds={products.map(p => p.id)}
        currentCategoryName={catNameById} />
    </div>
  )
}
