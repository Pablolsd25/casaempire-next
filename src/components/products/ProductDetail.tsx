'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import type { Product } from '@/types'

const WA_NUMBER = '525571527659'

// Unified media item: image or video
type MediaItem =
  | { type: 'image'; url: string }
  | { type: 'video'; url: string }

export default function ProductDetail({ product }: { product: Product }) {
  // Build combined media list: images first, then videos
  const mediaItems: MediaItem[] = [
    ...product.images.map((url) => ({ type: 'image' as const, url })),
    ...(product.videos ?? []).map((url) => ({ type: 'video' as const, url })),
  ]

  const [qty, setQty]                = useState(1)
  const [activeMedia, setActiveMedia] = useState(0)
  const [added, setAdded]            = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0

  const cat = product.category as { name: string; slug?: string } | null

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  function prevMedia() {
    setActiveMedia((p) => (p === 0 ? mediaItems.length - 1 : p - 1))
  }
  function nextMedia() {
    setActiveMedia((p) => (p === mediaItems.length - 1 ? 0 : p + 1))
  }

  const waText = encodeURIComponent(`Hola, me interesa el producto: *${product.name}*`)
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waText}`

  const stockColor =
    product.stock === 0 ? 'text-red-400' :
    product.stock <= 5  ? 'text-yellow-400' :
                          'text-emerald-400'

  const stockLabel =
    product.stock === 0 ? 'Sin stock' :
    product.stock <= 5  ? `¡Solo ${product.stock} disponibles!` :
                          'En stock'

  const current = mediaItems[activeMedia]

  return (
    <div>
      {/* ── Breadcrumb ────────────────────────────────────── */}
      <nav className="flex items-center flex-wrap gap-1.5 text-[11px] text-zinc-600 mb-8 font-display uppercase tracking-widest">
        <Link href="/" className="hover:text-zinc-400 transition-colors">Inicio</Link>
        <span className="text-zinc-800">/</span>
        <Link href="/tienda" className="hover:text-zinc-400 transition-colors">Tienda</Link>
        {cat && (
          <>
            <span className="text-zinc-800">/</span>
            <Link
              href={`/categoria/${(cat as { slug?: string }).slug ?? ''}`}
              className="hover:text-zinc-400 transition-colors"
            >
              {cat.name}
            </Link>
          </>
        )}
        <span className="text-zinc-800">/</span>
        <span className="text-accent truncate max-w-[180px]">{product.name}</span>
      </nav>

      {/* ── Two-column grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

        {/* ── LEFT: Media gallery ───────────────────────── */}
        <div className="space-y-3">

          {/* Main display */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/70 group">

            {current?.type === 'video' ? (
              /* ── Video player ── */
              <video
                key={current.url}
                src={current.url}
                controls
                controlsList="nodownload"
                playsInline
                className="w-full h-full object-contain"
              />
            ) : current?.type === 'image' ? (
              /* ── Image ── */
              <Image
                src={current.url}
                alt={product.name}
                fill
                className="object-contain transition-opacity duration-300"
                priority
              />
            ) : (
              /* ── Placeholder ── */
              <div className="w-full h-full flex items-center justify-center text-zinc-800">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Discount badge */}
            {hasDiscount && current?.type !== 'video' && (
              <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm">
                -{discountPct}%
              </div>
            )}

            {/* Out of stock overlay */}
            {product.stock === 0 && current?.type !== 'video' && (
              <div className="absolute inset-0 bg-black/65 flex items-center justify-center z-10">
                <span className="border border-zinc-600 text-zinc-400 font-display uppercase text-sm px-5 py-2 rounded-lg">
                  Agotado
                </span>
              </div>
            )}

            {/* Prev / Next arrows — only if multiple media */}
            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={prevMedia}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                    bg-black/60 text-white text-xl flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  ‹
                </button>
                <button
                  onClick={nextMedia}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                    bg-black/60 text-white text-xl flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  ›
                </button>
                {/* Counter */}
                <div className="absolute bottom-3 right-3 z-10 bg-black/60 text-zinc-400 text-[10px] font-display px-2 py-1 rounded-md">
                  {activeMedia + 1} / {mediaItems.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {mediaItems.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mediaItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActiveMedia(i)}
                  className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${activeMedia === i
                      ? 'border-accent shadow-[0_0_14px_rgba(35,243,14,0.35)] scale-105'
                      : 'border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100'
                    }`}
                >
                  {item.type === 'video' ? (
                    /* Video thumbnail — play icon */
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                      <svg
                        className={`w-7 h-7 transition-colors ${activeMedia === i ? 'text-accent' : 'text-zinc-500'}`}
                        viewBox="0 0 24 24" fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  ) : (
                    <Image src={item.url} alt="" fill className="object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Product info ───────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Category link */}
          {cat && (
            <Link
              href={`/categoria/${(cat as { slug?: string }).slug ?? ''}`}
              className="text-accent text-[11px] font-display uppercase tracking-[0.2em] hover:opacity-70 transition-opacity w-fit"
            >
              {cat.name}
            </Link>
          )}

          {/* Product name */}
          <h1 className="text-white font-display font-bold text-4xl sm:text-5xl uppercase leading-none tracking-tight">
            {product.name}
          </h1>

          {/* Price row */}
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-accent font-display font-bold text-4xl sm:text-5xl leading-none drop-shadow-[0_0_18px_rgba(35,243,14,0.45)]">
              ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </span>
            {hasDiscount && (
              <span className="text-zinc-600 text-2xl line-through leading-none">
                ${product.compare_at_price!.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
            )}
            <span className="text-zinc-500 text-sm font-display uppercase tracking-wider leading-none pb-1">MXN</span>
            {hasDiscount && (
              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                -{discountPct}% OFF
              </span>
            )}
          </div>

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-accent/40 via-zinc-700 to-transparent" />

          {/* Stock indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${product.stock === 0 ? 'bg-red-400' : product.stock <= 5 ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
            <span className={`text-sm font-medium ${stockColor}`}>{stockLabel}</span>
          </div>

          {/* Quantity selector */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-zinc-500 text-xs font-display uppercase tracking-widest">Cantidad</span>
              <div className="flex items-center rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900/50">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-11 h-11 flex items-center justify-center text-zinc-400
                    hover:text-white hover:bg-zinc-800 transition-colors text-xl font-light"
                >
                  −
                </button>
                <span className="w-12 text-center text-white font-display font-bold text-base select-none">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-11 h-11 flex items-center justify-center text-zinc-400
                    hover:text-white hover:bg-zinc-800 transition-colors text-xl font-light"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* ── CTAs ──────────────────────────────────────── */}
          <div className="flex flex-col gap-3 pt-1">
            {/* Primary — Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || added}
              className="w-full btn-accent py-4 rounded-xl text-sm font-display font-bold uppercase
                tracking-widest transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2.5"
            >
              {added ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  ¡Agregado al carrito!
                </>
              ) : product.stock === 0 ? (
                'Producto agotado'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                  Agregar al carrito
                </>
              )}
            </button>

            {/* Secondary — WhatsApp */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                border border-zinc-700 text-zinc-300 text-sm font-display uppercase tracking-widest
                hover:border-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/5 transition-all duration-200"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.823L.06 23.127a.75.75 0 00.918.919l5.304-1.45A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.95 9.95 0 01-5.07-1.384l-.361-.214-3.148.859.826-3.147-.234-.373A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              Consultar por WhatsApp
            </a>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { icon: '🚚', text: 'Envío a todo México' },
              { icon: '🔒', text: 'Pago 100% seguro' },
              { icon: '📦', text: 'Entrega en 2-5 días' },
              { icon: '✅', text: 'Garantía de calidad' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                <span className="text-sm flex-shrink-0">{b.icon}</span>
                <span className="text-zinc-400 text-xs leading-tight">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FULL-WIDTH DESCRIPTION SECTION ──────────────────── */}
      {(product.description || product.tags.length > 0) && (
        <div className="mt-16 mb-4">

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent mb-12" />

          {/* Section header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 bg-gradient-to-b from-accent to-accent/20 rounded-full" />
            <h2 className="text-white font-display font-bold text-2xl uppercase tracking-widest">
              Descripción del Producto
            </h2>
          </div>

          {/* Description card */}
          {product.description && (
            <div className="relative rounded-2xl overflow-hidden">
              {/* Subtle gradient background layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-600/5 pointer-events-none rounded-2xl" />
              <div className="relative bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 lg:p-12">
                <div
                  className="product-description text-zinc-300 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px] px-3 py-1.5 rounded-full
                    hover:text-accent hover:border-accent/40 transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
