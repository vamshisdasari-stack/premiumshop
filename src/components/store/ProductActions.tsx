"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Variant { id: string; name: string; value: string; priceAdj: number; stock: number; }

interface Product {
  id: string;
  name: string;
  stock: number;
  variants: Variant[];
}

export default function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const variantGroups = product.variants.reduce<Record<string, Variant[]>>((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name]?.push(v);
    return acc;
  }, {});

  async function addToCart() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, variantId: selectedVariant ?? undefined, quantity: qty }),
      });
      const data = await res.json();
      if (res.status === 401) { toast.error("Please login to add to cart"); router.push("/login"); return; }
      if (!res.ok) { toast.error(data.error ?? "Failed to add"); return; }
      toast.success("Added to cart!");
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }

  async function addToWishlist() {
    setWishlistLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.status === 401) { toast.error("Please login"); router.push("/login"); return; }
      toast.success("Added to wishlist!");
    } catch { toast.error("Network error"); }
    finally { setWishlistLoading(false); }
  }

  const isOutOfStock = product.stock === 0;

  return (
    <div className="space-y-5">
      {/* Variant selectors */}
      {Object.entries(variantGroups).map(([groupName, variants]) => (
        <div key={groupName}>
          <p className="text-sm font-semibold text-gray-800 mb-2">{groupName}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                disabled={v.stock === 0}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition ${
                  v.id === selectedVariant
                    ? "border-[#1a1a2e] bg-[#1a1a2e] text-white"
                    : v.stock === 0
                    ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                    : "border-gray-200 text-gray-700 hover:border-gray-400"
                }`}
              >
                {v.value}
                {v.priceAdj > 0 && ` (+₹${v.priceAdj})`}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Quantity */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Quantity</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition text-lg">−</button>
            <span className="w-10 text-center text-sm font-semibold">{qty}</span>
            <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition text-lg">+</button>
          </div>
          <span className="text-sm text-gray-400">{product.stock} in stock</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={addToCart}
          disabled={loading || isOutOfStock}
          className="flex-1 bg-[#1a1a2e] hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200"
        >
          {loading ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
        <button
          onClick={addToWishlist}
          disabled={wishlistLoading}
          className="w-12 h-12 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition text-gray-500 hover:text-red-500"
          aria-label="Add to wishlist"
        >
          ♡
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>🔒</span> Secure checkout via Razorpay · Free returns
      </div>
    </div>
  );
}
