import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductDetail from '@/components/products/ProductDetail'
import type { Product } from '@/types'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('name, description').eq('slug', slug).single()
  return { title: data?.name ?? 'Producto', description: data?.description ?? undefined }
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= rating ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.8"
          className={i <= rating ? 'text-yellow-400' : 'text-zinc-600'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  // Reseñas aprobadas para este producto
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, title, comment, created_at')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20)

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ProductDetail product={product as Product} />

      {/* ── Sección de reseñas ── */}
      {reviews && reviews.length > 0 && (
        <section className="mt-16 border-t border-zinc-800 pt-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-white font-display font-bold text-2xl uppercase tracking-wide">
              Reseñas
            </h2>
            {avgRating !== null && (
              <div className="flex items-center gap-2">
                <Stars rating={Math.round(avgRating)} />
                <span className="text-zinc-400 text-sm">
                  {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
                </span>
              </div>
            )}
          </div>

          {/* Grid de reseñas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} size={14} />
                  <span className="text-zinc-600 text-xs">
                    {new Date(r.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                {r.title && (
                  <p className="text-white text-sm font-semibold">{r.title}</p>
                )}
                {r.comment && (
                  <p className="text-zinc-400 text-sm leading-relaxed">{r.comment}</p>
                )}
                <p className="text-zinc-600 text-xs">— {r.reviewer_name ?? 'Cliente verificado'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
