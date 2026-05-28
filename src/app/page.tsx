import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/products/ProductGrid'
import VideoHero from '@/components/home/VideoHero'
import type { Product } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  const products = (featuredProducts ?? []) as Product[]

  return (
    <div>
      {/* Hero — Video intro Empire Nutrition */}
      <VideoHero />

      {/* Categorías */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-white font-display font-semibold text-2xl uppercase tracking-wide mb-8 text-center">
          Explora por categoría
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href:  '/categoria/hombres',
              label: "Men's Nutrition",
              sub:   'Proteínas, pre-workout, creatina y más',
              bg:    'from-zinc-800 to-zinc-900',
            },
            {
              href:  '/categoria/mujeres',
              label: "Women's Nutrition",
              sub:   'Pink Kit, Glow Protein, quemadores',
              bg:    'from-zinc-800 to-zinc-900',
            },
            {
              href:  '/ofertas',
              label: 'Nuestras Ofertas',
              sub:   'Hasta 40% de descuento',
              bg:    'from-zinc-800 to-zinc-900',
            },
          ].map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`group relative h-44 rounded-sm bg-gradient-to-br ${cat.bg} border border-zinc-700
                hover:border-accent transition-all duration-300 flex flex-col justify-end p-5 overflow-hidden`}
            >
              <h3 className="text-white font-display font-semibold text-lg uppercase tracking-wide">
                {cat.label}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">{cat.sub}</p>
              <span className="absolute right-4 bottom-4 text-zinc-600 group-hover:text-accent transition-colors text-lg">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white font-display font-semibold text-2xl uppercase tracking-wide">
              Productos destacados
            </h2>
            <Link href="/tienda" className="text-accent hover:text-white text-sm font-display uppercase tracking-wide transition-colors">
              Ver todos →
            </Link>
          </div>
          <ProductGrid products={products} />
        </section>
      )}

      {/* Video showcase — WEB HD */}
      <section className="bg-black py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-white font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-tight">
              Alcanza tu <span className="text-accent">Máximo Potencial</span>
            </h2>
            <p className="text-zinc-400 mt-2 text-sm sm:text-base">
              Suplementos diseñados para llevarte al siguiente nivel
            </p>
          </div>

          {/* Video contenedor — borde verde neón */}
          <div className="relative rounded-xl overflow-hidden border border-accent/40 shadow-[0_0_40px_rgba(35,243,14,0.15)]">
            <video
              className="w-full aspect-video object-cover"
              autoPlay
              muted
              loop
              playsInline
            >
              <source
                src="https://video.wixstatic.com/video/5cd3e7_a1bdec1e652044e2bae0b70b3d022289/1080p/mp4/file.mp4"
                type="video/mp4"
                media="(min-width: 1024px)"
              />
              <source
                src="https://video.wixstatic.com/video/5cd3e7_a1bdec1e652044e2bae0b70b3d022289/720p/mp4/file.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Link
              href="/tienda"
              className="btn-accent inline-block px-10 py-3 rounded-sm text-base"
            >
              Ver Tienda
            </Link>
          </div>
        </div>
      </section>

      {/* Ventajas */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '🚚', title: 'Envío seguro',        desc: 'A todo México desde $99' },
              { icon: '🛡️', title: 'Garantía de calidad', desc: 'Productos 100% originales' },
              { icon: '🔒', title: 'Pago seguro',          desc: 'Con OpenPay, tarjeta o efectivo' },
            ].map((v) => (
              <div key={v.title} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{v.icon}</span>
                <h3 className="text-white font-display font-semibold uppercase tracking-wide text-sm">{v.title}</h3>
                <p className="text-zinc-400 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
