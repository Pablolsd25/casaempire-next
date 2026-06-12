import ProductCard from "./ProductCard";
import type { ProductListItem } from "@/types";

interface Props {
  products: ProductListItem[];
  title?: string;
  columns?: 3 | 4;
}

export default function ProductGrid({ products, title, columns = 4 }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 text-lg">No se encontraron productos.</p>
      </div>
    );
  }

  const gridClass =
    columns === 3
      ? "grid grid-cols-2 sm:grid-cols-3 gap-4"
      : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <section>
      {title && <h2 className="text-white font-bold text-2xl mb-6">{title}</h2>}
      <div className={gridClass}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
