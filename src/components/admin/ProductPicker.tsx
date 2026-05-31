'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Check, Search } from 'lucide-react'

export interface PickableProduct {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  category_id: string | null
  is_active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  /** Devuelve los productos seleccionados para agregar */
  onConfirm: (products: PickableProduct[]) => void
  /** Ids ya en la categoría (se ocultan) */
  excludeIds?: string[]
  /** Nombre de categoría actual de cada producto, para mostrar advertencia de reasignación */
  currentCategoryName?: (categoryId: string | null) => string | null
}

export default function ProductPicker({ open, onClose, onConfirm, excludeIds = [], currentCategoryName }: Props) {
  const [products, setProducts] = useState<PickableProduct[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) setProducts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) { setSelected(new Set()); setQ(''); fetchProducts() }
  }, [open, fetchProducts])

  if (!open) return null

  const exclude = new Set(excludeIds)
  const visible = products
    .filter(p => !exclude.has(p.id))
    .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const confirm = () => {
    if (selected.size === 0) return
    onConfirm(products.filter(p => selected.has(p.id)))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-white font-bold text-lg">Agregar productos</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto..."
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : visible.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-16">No hay productos disponibles.</p>
          ) : (
            <div className="space-y-1.5">
              {visible.map(p => {
                const isSel = selected.has(p.id)
                const otherCat = currentCategoryName?.(p.category_id)
                return (
                  <button type="button" key={p.id} onClick={() => toggle(p.id)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg border transition-colors text-left
                      ${isSel ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-zinc-800/60'}`}>
                    <span className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center
                      ${isSel ? 'bg-accent border-accent' : 'border-zinc-600'}`}>
                      {isSel && <Check className="h-3.5 w-3.5 text-black" />}
                    </span>
                    <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{p.name}</p>
                      <p className="text-zinc-500 text-xs">
                        ${Number(p.price).toLocaleString('es-MX')}
                        {otherCat && <span className="text-amber-500/80"> · se moverá desde “{otherCat}”</span>}
                      </p>
                    </div>
                    {!p.is_active && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Oculto</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between">
          <span className="text-zinc-500 text-sm">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={selected.size === 0}
              className="btn-accent px-5 py-2 rounded-lg text-sm disabled:opacity-50">
              Agregar {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
