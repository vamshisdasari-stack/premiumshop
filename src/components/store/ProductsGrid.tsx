import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  avgRating: number | null;
  reviewCount: number;
  category: { name: string; slug: string };
}

interface Props {
  searchParams: { page?: string; category?: string; q?: string; sort?: string; minPrice?: string; maxPrice?: string; featured?: string };
}

async function fetchProducts(sp: Props["searchParams"]) {
  const params = new URLSearchParams();
  if (sp.page) params.set("page", sp.page);
  if (sp.category) params.set("category", sp.category);
  if (sp.q) params.set("q", sp.q);
  if (sp.sort) params.set("sort", sp.sort);
  if (sp.minPrice) params.set("minPrice", sp.minPrice);
  if (sp.maxPrice) params.set("maxPrice", sp.maxPrice);
  if (sp.featured) params.set("featured", sp.featured);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/products?${params.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { products: [], total: 0, pages: 1 };
  const data = await res.json();
  return data.data;
}

export default async function ProductsGrid({ searchParams }: Props) {
  const { products, total, pages } = await fetchProducts(searchParams);
  const page = Number(searchParams.page ?? 1);

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🛍️</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
        <p className="text-gray-500">Try adjusting your filters or search term.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{total} products</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {(products as Product[]).map((product) => {
          const discount = product.comparePrice
            ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
            : null;

          return (
            <Link key={product.id} href={`/products/${product.slug}`} className="group">
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                )}
                {discount && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    -{discount}%
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Out of Stock</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-0.5">{product.category.name}</p>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                  {product.name}
                </h3>

                {product.avgRating !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-amber-400 text-xs">{"★".repeat(Math.round(product.avgRating))}</span>
                    <span className="text-xs text-gray-400">({product.reviewCount})</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-bold text-gray-900">₹{product.price.toLocaleString("en-IN")}</span>
                  {product.comparePrice && (
                    <span className="text-sm text-gray-400 line-through">₹{product.comparePrice.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {[...Array(pages)].map((_, i) => {
            const sp = new URLSearchParams({ ...searchParams, page: String(i + 1) });
            return (
              <Link key={i} href={`/products?${sp.toString()}`}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition ${
                  page === i + 1 ? "bg-[#1a1a2e] text-white" : "border border-gray-200 text-gray-700 hover:border-amber-400"
                }`}>
                {i + 1}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
