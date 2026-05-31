'use client'

import { useState } from 'react'

interface Item {
  quantity: number
  unit_price: number
  name?: string | null
  product_image?: string | null
}

export default function OrderItemsExpander({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false)

  // Sum total units
  const totalUnits = items.reduce((s, i) => s + (i.quantity ?? 0), 0)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors tabular-nums"
      >
        {totalUnits}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 right-0 top-7 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 space-y-2">
          <p className="text-zinc-400 text-xs font-medium mb-2">Ítems: ({totalUnits})</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.product_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product_image}
                  alt={item.name ?? ''}
                  className="w-10 h-10 rounded object-cover shrink-0 bg-zinc-800"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-zinc-800 shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-xs font-medium truncate">
                  {item.name ?? 'Producto'}
                </p>
                <p className="text-zinc-500 text-xs">
                  ${Number(item.unit_price).toLocaleString('es-MX')} MXN
                </p>
              </div>
              <span className="text-zinc-400 text-xs shrink-0">x {item.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
