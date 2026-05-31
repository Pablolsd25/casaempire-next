'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Trash2, Layers } from 'lucide-react'

export interface CategoryCard {
  id: string
  name: string
  slug: string
  image_url: string | null
  count: number
}

function CardMenu({ cat, onDelete }: { cat: CategoryCard; onDelete: (c: CategoryCard) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={e => e.preventDefault()}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm">
          <Link href={`/admin/categorias/${cat.id}`}
            className="flex items-center gap-2 px-3 py-2 text-zinc-200 hover:bg-zinc-700 transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
          <button type="button" onClick={() => { setOpen(false); onDelete(cat) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-zinc-700 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

export default function CategoryGrid({ initial }: { initial: CategoryCard[] }) {
  const router = useRouter()
  const [cats, setCats] = useState(initial)

  const handleDelete = async (cat: CategoryCard) => {
    const msg = cat.count > 0
      ? `¿Eliminar "${cat.name}"? Sus ${cat.count} producto(s) quedarán sin categoría.`
      : `¿Eliminar la categoría "${cat.name}"?`
    if (!confirm(msg)) return
    setCats(prev => prev.filter(c => c.id !== cat.id))
    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (cats.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg py-16 text-center">
        <Layers className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
        <p className="text-white font-medium">Aún no hay categorías</p>
        <p className="text-zinc-500 text-sm mt-1 mb-5">Agrupa productos relacionados para mostrarlos en tu tienda.</p>
        <Link href="/admin/categorias/nuevo" className="btn-accent px-5 py-2.5 rounded text-sm inline-block">
          + Nueva categoría
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cats.map(cat => (
        <Link key={cat.id} href={`/admin/categorias/${cat.id}`}
          className="group relative aspect-[16/10] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors">
          {/* Imagen de fondo */}
          {cat.image_url ? (
            <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Layers className="h-10 w-10 text-zinc-700" />
            </div>
          )}
          {/* Degradado para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

          {/* Menú */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <CardMenu cat={cat} onDelete={handleDelete} />
          </div>

          {/* Nombre + conteo */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
            <h3 className="text-white font-semibold text-lg leading-tight drop-shadow">{cat.name}</h3>
            <span className="text-white/90 text-sm font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded flex-shrink-0">
              {cat.count}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
