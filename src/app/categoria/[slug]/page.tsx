import { createPublicClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import EmpireBanner from "@/components/ui/EmpireBanner";
import PageHero from "@/components/layout/PageHero";
import { fetchActiveProductsByCategory } from "@/lib/product-categories";
import type { ProductListItem, Category } from "@/types";
import { asProductListItems } from "@/lib/supabase/product-selects";
import type { Metadata } from "next";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

const CATEGORY_THEME: Record<
  string,
  {
    displayName: string;
    description: string;
    accentColor: string;
    glowRgba: string;
  }
> = {
  "women-s-nutrition": {
    displayName: "Women's Nutrition",
    description: "Suplementos y nutrición especialmente diseñados para mujeres",
    accentColor: "#E8177A",
    glowRgba: "rgba(232,23,122,0.08)",
  },
  "men-nutrition": {
    displayName: "Men's Nutrition",
    description: "Suplementos y nutrición para hombres de alto rendimiento",
    accentColor: "#23F30E",
    glowRgba: "rgba(35,243,14,0.07)",
  },
};

const DEFAULT_THEME = {
  accentColor: "#23F30E",
  glowRgba: "rgba(35,243,14,0.07)",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = CATEGORY_THEME[slug];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();
  const name = theme?.displayName ?? data?.name ?? "Categoría";
  return { title: `${name} | Empire Nutrition` };
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  const products = await fetchActiveProductsByCategory(
    supabase,
    (category as Category).id,
  );

  const cat = category as Category;
  const prods = asProductListItems(products);

  const theme = CATEGORY_THEME[slug] ?? {
    ...DEFAULT_THEME,
    displayName: cat.name,
    description: cat.description ?? "",
  };

  return (
    <div
      style={
        {
          "--accent": theme.accentColor,
          "--accent-dim": theme.accentColor,
        } as React.CSSProperties
      }
    >
      <PageHero glowColor={theme.glowRgba}>
        <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-display uppercase tracking-wide">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Inicio
          </Link>
          <span className="text-zinc-700">/</span>
          <Link
            href="/tienda"
            className="hover:text-zinc-300 transition-colors"
          >
            Tienda
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-accent">{theme.displayName}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-white font-display font-bold text-4xl sm:text-5xl uppercase tracking-tight leading-none">
              {theme.displayName}
            </h1>
            <div className="mt-3 h-[3px] w-14 bg-accent rounded-full" />
            {theme.description && (
              <p className="text-zinc-400 mt-4 text-sm max-w-lg leading-relaxed">
                {theme.description}
              </p>
            )}
          </div>
          <span className="text-zinc-600 font-display text-sm uppercase tracking-wider shrink-0">
            {prods.length} {prods.length === 1 ? "producto" : "productos"}
          </span>
        </div>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductGrid products={prods} />
      </div>

      <EmpireBanner />
    </div>
  );
}
