import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsGrid from "@/components/store/ProductsGrid";
import ProductsSkeleton from "@/components/store/ProductsSkeleton";
import ProductFilters from "@/components/store/ProductFilters";

export const metadata: Metadata = {
  title: "Shop All Products",
  description: "Browse our premium collection of clothing and daily essentials.",
};

export default function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; q?: string; sort?: string; minPrice?: string; maxPrice?: string; featured?: string };
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <ProductFilters searchParams={searchParams} />
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {searchParams.q ? `Results for "${searchParams.q}"` : searchParams.category ? "Category" : searchParams.featured ? "Featured Products" : "All Products"}
            </h1>
            <select name="sort" defaultValue={searchParams.sort ?? "newest"}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          <Suspense fallback={<ProductsSkeleton />}>
            <ProductsGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
