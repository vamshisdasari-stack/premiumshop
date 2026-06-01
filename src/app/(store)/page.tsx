import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PremiumShop — Premium Clothing & Daily Essentials",
  description: "Shop our curated collection of premium clothing and everyday essentials. Free shipping on orders above ₹999.",
};

async function getFeaturedProducts() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/products?featured=true&limit=8`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data.products ?? [];
  } catch { return []; }
}

async function getCategories() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/admin/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).filter((c: { isActive: boolean }) => c.isActive).slice(0, 6);
  } catch { return []; }
}

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium px-4 py-2 rounded-full mb-6">
              ✨ New collection just arrived
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6">
              Premium Style,<br /><span className="text-amber-400">Everyday Comfort</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Discover our curated collection of premium clothing and daily essentials. Quality you can feel, prices you&apos;ll love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-amber-500/30">
                Shop Now →
              </Link>
              <Link href="/products?featured=true" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl border border-white/20 transition-all duration-200">
                View Featured
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-amber-50 border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🚚", label: "Free Shipping", sub: "On orders over ₹999" },
            { icon: "↩️", label: "Easy Returns", sub: "30-day return policy" },
            { icon: "🔒", label: "Secure Payment", sub: "Razorpay protected" },
            { icon: "⭐", label: "Premium Quality", sub: "Handpicked products" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.label}</p>
                <p className="text-xs text-gray-500">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat: { id: string; name: string; slug: string; image: string | null }) => (
              <Link key={cat.id} href={`/products?category=${cat.slug}`}
                className="group relative bg-gray-100 rounded-2xl overflow-hidden aspect-video flex items-end p-5 hover:shadow-lg transition-shadow">
                {cat.image && (
                  <Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                )}
                <div className="relative z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2">
                  <p className="font-bold text-gray-900">{cat.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold text-gray-900">Featured Products</h2>
            <Link href="/products?featured=true" className="text-sm font-medium text-amber-600 hover:underline">View all →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((p: { id: string; name: string; slug: string; price: number; comparePrice: number | null; images: string[]; category: { name: string }; avgRating: number | null; reviewCount: number }) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group">
                <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3">
                  {p.images[0] ? (
                    <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-0.5">{p.category.name}</p>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-amber-600 transition-colors">{p.name}</h3>
                {p.avgRating && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-amber-400 text-xs">{"★".repeat(Math.round(p.avgRating))}</span>
                    <span className="text-xs text-gray-400">({p.reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-bold text-gray-900">₹{p.price.toLocaleString("en-IN")}</span>
                  {p.comparePrice && <span className="text-sm text-gray-400 line-through">₹{p.comparePrice.toLocaleString("en-IN")}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
