"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular", label: "Most Popular" },
];

const PRICE_RANGES = [
  { label: "Under ₹500", min: "0", max: "500" },
  { label: "₹500 – ₹1000", min: "500", max: "1000" },
  { label: "₹1000 – ₹2000", min: "1000", max: "2000" },
  { label: "Above ₹2000", min: "2000", max: "" },
];

export default function ProductFilters({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const router = useRouter();
  const current = useSearchParams();

  const update = useCallback((key: string, value: string | null) => {
    const sp = new URLSearchParams(current.toString());
    if (value === null || value === "") sp.delete(key);
    else sp.set(key, value);
    sp.delete("page"); // Reset page on filter change
    router.push(`/products?${sp.toString()}`);
  }, [current, router]);

  const clearAll = () => router.push("/products");

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Search</label>
        <form onSubmit={e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value; update("q", v); }}>
          <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search products..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </form>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Sort by</label>
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => update("sort", opt.value)}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition ${searchParams.sort === opt.value ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Price Range</label>
        <div className="space-y-1">
          <button onClick={() => { update("minPrice", null); update("maxPrice", null); }}
            className={`w-full text-left text-sm px-3 py-2 rounded-xl transition ${!searchParams.minPrice && !searchParams.maxPrice ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
            All prices
          </button>
          {PRICE_RANGES.map(r => (
            <button key={r.label} onClick={() => { update("minPrice", r.min); update("maxPrice", r.max); }}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition ${searchParams.minPrice === r.min ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(searchParams).filter(k => searchParams[k]).length > 0 && (
        <button onClick={clearAll} className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-xl py-2 transition">
          Clear all filters
        </button>
      )}
    </div>
  );
}
