import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHomePageVideos } from "@/lib/home-video";
import ProductGrid from "@/components/products/ProductGrid";
import VideoHero from "@/components/home/VideoHero";
import VideoShowcase from "@/components/home/VideoShowcase";
import AboutSection from "@/components/home/AboutSection";
import type { Product } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const homeVideos = await getHomePageVideos(adminSupabase);

  const WOMENS_CAT = "ce1d4d02-1d13-451a-a163-2acd8e4dceef";
  const MENS_CAT = "fa7a76af-6241-49c2-a849-65eea9a710f1";

  const [{ data: womenProds }, { data: menProds }] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("is_active", true)
      .eq("category_id", WOMENS_CAT)
      .order("sort_order", { ascending: true })
      .limit(3),
    supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("is_active", true)
      .eq("category_id", MENS_CAT)
      .order("sort_order", { ascending: true })
      .limit(3),
  ]);

  const products = [...(womenProds ?? []), ...(menProds ?? [])] as Product[];

  return (
    <div>
      {/* Hero — Video intro Empire Nutrition */}
      <VideoHero video480={homeVideos.video480} video1080={homeVideos.video1080} />

      {/* Video promocional — antes de categorías */}
      <VideoShowcase videoUrl={homeVideos.showcaseVideo} />

      {/* Categorías */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center mb-10">
          <h2 className="text-white font-display font-bold text-3xl sm:text-4xl uppercase tracking-tight">
            Explora por categoría
          </h2>
          <div className="mt-3 h-[3px] w-12 bg-accent rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/categoria/men-nutrition",
              label: "Men's Nutrition",
              sub: "Proteínas, pre-workout, creatina y más",
              tag: "7 Productos",
              stripe: "#6366f1",
              pillBg: "bg-indigo-500/20",
              pillText: "text-indigo-300",
              pillBorder: "border-indigo-500/40",
              cardBg:
                "bg-gradient-to-br from-indigo-950/50 via-zinc-950 to-zinc-950",
              cardBorder: "border-indigo-500/30",
              cardShadow: "hover:shadow-[0_0_32px_rgba(99,102,241,0.18)]",
              arrowColor: "group-hover:text-indigo-400",
            },
            {
              href: "/categoria/women-s-nutrition",
              label: "Women's Nutrition",
              sub: "Pink Kit, Glow Protein, quemadores",
              tag: "12 Productos",
              stripe: "#ec4899",
              pillBg: "bg-pink-500/20",
              pillText: "text-pink-300",
              pillBorder: "border-pink-500/40",
              cardBg:
                "bg-gradient-to-br from-pink-950/50 via-zinc-950 to-zinc-950",
              cardBorder: "border-pink-500/30",
              cardShadow: "hover:shadow-[0_0_32px_rgba(236,72,153,0.18)]",
              arrowColor: "group-hover:text-pink-400",
            },
            {
              href: "/tienda",
              label: "Ver Tienda",
              sub: "Todos nuestros productos disponibles",
              tag: "19 Productos",
              stripe: "#23f30e",
              pillBg: "bg-accent/15",
              pillText: "text-accent",
              pillBorder: "border-accent/40",
              cardBg:
                "bg-gradient-to-br from-green-950/40 via-zinc-950 to-zinc-950",
              cardBorder: "border-accent/25",
              cardShadow: "hover:shadow-[0_0_32px_rgba(35,243,14,0.15)]",
              arrowColor: "group-hover:text-accent",
            },
          ].map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`group relative rounded-xl ${cat.cardBg} border ${cat.cardBorder} ${cat.cardShadow}
                transition-all duration-300 overflow-hidden flex flex-col gap-3 p-5
                hover:scale-[1.02]`}
            >
              {/* Left color stripe */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                style={{ background: cat.stripe }}
              />

              {/* Top row: pill badge */}
              <div className="flex items-center justify-between pl-1">
                <span
                  className={`text-[10px] font-display uppercase tracking-widest px-2 py-0.5 rounded-md border ${cat.pillBg} ${cat.pillText} ${cat.pillBorder}`}
                >
                  {cat.tag}
                </span>
              </div>

              {/* Content */}
              <div className="pl-1">
                <h3 className="text-white font-display font-bold text-lg uppercase tracking-wide leading-tight">
                  {cat.label}
                </h3>
                <p className="text-zinc-400 text-xs mt-1 leading-snug">
                  {cat.sub}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-1.5 pl-1 mt-1">
                <span className="text-[10px] font-display uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors duration-200">
                  Ver productos
                </span>
                <span
                  className={`text-zinc-600 ${cat.arrowColor} group-hover:translate-x-1 transition-all duration-200`}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tight">
                Productos destacados
              </h2>
              <div className="mt-2 h-[3px] w-10 bg-accent rounded-full" />
            </div>
            <Link
              href="/tienda"
              className="text-accent hover:text-white text-xs font-display uppercase tracking-widest transition-colors flex items-center gap-1 group"
            >
              Ver todos
              <span className="group-hover:translate-x-1 transition-transform duration-200">
                →
              </span>
            </Link>
          </div>
          <ProductGrid products={products} columns={3} />
        </section>
      )}

      {/* Quiénes somos */}
      <AboutSection />

      {/* Ventajas */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                ),
                title: "Envío seguro",
                desc: "A todo México desde $99",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
                title: "Garantía de calidad",
                desc: "Productos 100% originales",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                ),
                title: "Pago seguro",
                desc: "Con OpenPay, tarjeta o efectivo",
              },
            ].map((v) => (
              <div key={v.title} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-accent">
                  {v.icon}
                </div>
                <h3 className="text-white font-display font-semibold uppercase tracking-wide text-sm">
                  {v.title}
                </h3>
                <p className="text-zinc-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
