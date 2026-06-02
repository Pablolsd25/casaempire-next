'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [hovered, setHovered] = useState(false)
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/60 hover:border-accent/50 transition-all duration-300 flex flex-col"
      style={hovered ? { boxShadow: '0 0 30px color-mix(in srgb, var(--color-accent) 10%, transparent)' } : undefined}
    >

      {/* Top accent line — slides in on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

      {/* Imagen */}
      <Link href={`/producto/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-black flex-shrink-0">
        {product.images[0] ? (
          <>
            {/* Imagen principal */}
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-contain transition-opacity duration-500 ${
                hovered && product.images[1] ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* Segunda imagen (hover) */}
            {product.images[1] && (
              <Image
                src={product.images[1]}
                alt={`${product.name} — vista alternativa`}
                fill
                className={`object-contain transition-opacity duration-500 ${
                  hovered ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badge descuento */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-display font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm z-10">
            -{discountPct}%
          </span>
        )}

        {/* Sin stock */}
        {product.manage_stock && product.stock === 0 && (
          <span className="absolute top-2 right-2 bg-black/80 text-zinc-400 text-[10px] font-display uppercase tracking-wide px-2 py-0.5 rounded-sm z-10">
            Agotado
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Categoría */}
        {product.category && (
          <span className="text-accent text-[10px] font-display uppercase tracking-widest">
            {product.category.name}
          </span>
        )}

        {/* Nombre */}
        <Link href={`/producto/${product.slug}`} className="flex-1">
          <h3 className="text-white font-display font-semibold text-sm uppercase tracking-wide leading-snug hover:text-accent transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Precio */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-accent font-display font-bold text-base">
            ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          {hasDiscount && (
            <span className="text-zinc-600 text-xs line-through">
              ${product.compare_at_price!.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
          <span className="text-zinc-600 text-[10px] ml-auto font-display uppercase tracking-wider">MXN</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => addItem(product)}
          disabled={product.manage_stock && product.stock === 0}
          className="mt-1 w-full btn-accent text-xs py-2.5 rounded-sm flex items-center justify-center gap-1.5
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {product.manage_stock && product.stock === 0 ? (
            'Agotado'
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Agregar al carrito
            </>
          )}
        </button>
      </div>
    </div>
  )
}
