import { createPublicClient } from "@/lib/supabase/server";
import { isOffersCategory } from "@/lib/offers";
import { fetchOfferProducts } from "@/lib/product-categories";
import ProductGrid from "@/components/products/ProductGrid";
import PageHero from "@/components/layout/PageHero";
import type { ProductListItem } from "@/types";
import { asProductListItems } from "@/lib/supabase/product-selects";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Nuestras Ofertas" };

export default async function OfertasPage() {
  const supabase = createPublicClient();

  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, slug, name");

  const offerCatIds = (allCategories ?? [])
    .filter(isOffersCategory)
    .map((c) => c.id);

  const products = await fetchOfferProducts(supabase, offerCatIds);

  return (
    <div>
      <PageHero
        title="Nuestras Ofertas"
        subtitle="Productos en oferta especial — precios exclusivos por tiempo limitado."
        image="/hero-secondary.jpg"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {products.length > 0 ? (
          <ProductGrid products={asProductListItems(products)} />
        ) : (
          <p className="text-zinc-500 text-sm text-center py-16">
            No hay ofertas activas en este momento. ¡Vuelve pronto!
          </p>
        )}
      </div>
    </div>
  );
}
