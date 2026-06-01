"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface CartItem {
  id: string;
  quantity: number;
  product: { id: string; name: string; slug: string; price: number; images: string[]; stock: number };
  variant: { name: string; value: string } | null;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  const loadCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) { router.push("/login?redirect=/cart"); return; }
      const data = await res.json();
      setItems(data.data.items ?? []);
      setTotal(data.data.total ?? 0);
    } catch { toast.error("Failed to load cart"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadCart(); }, [loadCart]);

  async function updateQty(cartItemId: string, quantity: number) {
    setUpdating(cartItemId);
    try {
      await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity }),
      });
      await loadCart();
    } catch { toast.error("Update failed"); }
    finally { setUpdating(null); }
  }

  const shippingCost = total >= 999 ? 0 : 99;
  const tax = Math.round(total * 0.18 * 100) / 100;
  const grandTotal = total + shippingCost + tax;

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse mb-4" />)}
    </div>
  );

  if (items.length === 0) return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
      <div className="text-7xl mb-6">🛒</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
      <p className="text-gray-500 mb-8">Add some items to get started!</p>
      <Link href="/products" className="inline-block bg-[#1a1a2e] text-white font-semibold px-8 py-3 rounded-2xl hover:bg-gray-800 transition">
        Shop Now
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-8">Shopping Cart ({items.length})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(item => (
              <motion.div key={item.id} layout exit={{ opacity: 0, x: -20 }}
                className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="w-20 h-20 relative bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  <Link href={`/products/${item.product.slug}`}>
                    <Image src={item.product.images[0] ?? ""} alt={item.product.name} fill className="object-cover" sizes="80px" />
                  </Link>
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product.slug}`} className="font-semibold text-gray-900 hover:text-amber-600 transition line-clamp-1">
                    {item.product.name}
                  </Link>
                  {item.variant && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.variant.name}: {item.variant.value}</p>
                  )}
                  <p className="font-bold text-gray-900 mt-1">₹{item.product.price.toLocaleString("en-IN")}</p>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={updating === item.id}
                        className="w-8 h-8 text-gray-500 hover:bg-gray-50 transition">−</button>
                      <span className="w-8 text-center text-sm">{updating === item.id ? "…" : item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={updating === item.id || item.quantity >= item.product.stock}
                        className="w-8 h-8 text-gray-500 hover:bg-gray-50 transition">+</button>
                    </div>
                    <button onClick={() => updateQty(item.id, 0)} className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-5">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? <span className="text-green-600">FREE</span> : `₹${shippingCost}`}</span>
              </div>
              <div className="flex justify-between text-gray-600"><span>GST (18%)</span><span>₹{tax.toLocaleString("en-IN")}</span></div>
              {total < 999 && <p className="text-xs text-amber-600">Add ₹{(999 - total).toLocaleString("en-IN")} more for free shipping!</p>}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <Link href="/checkout"
              className="mt-6 block w-full bg-[#1a1a2e] hover:bg-gray-800 text-white font-bold py-3.5 rounded-2xl text-center transition">
              Proceed to Checkout
            </Link>
            <Link href="/products" className="mt-3 block text-center text-sm text-gray-500 hover:text-gray-700 transition">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
