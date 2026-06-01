"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: new (opts: object) => { open: () => void };
  }
}

interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

interface CartItem {
  id: string;
  quantity: number;
  product: { name: string; price: number; images: string[] };
  variant: { name: string; value: string } | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Address form
  const [newAddr, setNewAddr] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
  const [addingAddr, setAddingAddr] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cartRes, addrRes] = await Promise.all([
        fetch("/api/cart"),
        fetch("/api/account/addresses").catch(() => null),
      ]);
      if (cartRes.status === 401) { router.push("/login?redirect=/checkout"); return; }
      const cartData = await cartRes.json();
      setItems(cartData.data.items ?? []);
      setTotal(cartData.data.total ?? 0);
      if (addrRes?.ok) {
        const addrData = await addrRes.json();
        setAddresses(addrData.data ?? []);
        const def = addrData.data?.find((a: Address & { isDefault: boolean }) => a.isDefault);
        if (def) setSelectedAddress(def.id);
      }
    } catch { toast.error("Failed to load checkout"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  async function saveAddress() {
    setAddingAddr(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAddr, isDefault: addresses.length === 0 }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      toast.success("Address saved");
      await load();
      setSelectedAddress(d.data.id);
      setNewAddr({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    } catch { toast.error("Error"); }
    finally { setAddingAddr(false); }
  }

  async function placeOrder() {
    if (!selectedAddress) { toast.error("Please select a delivery address."); return; }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddress }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create order"); return; }

      const { razorpayOrderId, amount, orderNumber } = data.data;

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "PremiumShop",
        description: `Order ${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {},
        theme: { color: "#f59e0b" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) { toast.error(verifyData.error ?? "Payment verification failed"); return; }
          toast.success("Order placed successfully! 🎉");
          router.push(`/orders`);
        },
        modal: { ondismiss: () => { toast.error("Payment cancelled."); setPlacing(false); } },
      });

      rzp.open();
    } catch { toast.error("Error placing order"); setPlacing(false); }
  }

  const shipping = total >= 999 ? 0 : 99;
  const tax = Math.round(total * 0.18 * 100) / 100;
  const grandTotal = total + shipping + tax;

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-80 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery address */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900 mb-4">Delivery Address</h2>

            {addresses.length > 0 && (
              <div className="space-y-3 mb-5">
                {addresses.map(addr => (
                  <label key={addr.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${selectedAddress === addr.id ? "border-[#1a1a2e] bg-gray-50" : "border-gray-200"}`}>
                    <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{addr.name} · {addr.phone}</p>
                      <p className="text-gray-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                      <p className="text-gray-600">{addr.city}, {addr.state} — {addr.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Add new address */}
            <details className={addresses.length === 0 ? "" : "mt-4"}>
              <summary className="cursor-pointer text-sm font-medium text-amber-600 hover:text-amber-700">
                {addresses.length === 0 ? "+ Add your delivery address" : "+ Add new address"}
              </summary>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[["name", "Full Name"], ["phone", "Phone"], ["line1", "Address Line 1"], ["line2", "Line 2 (optional)"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]].map(([field, label]) => (
                  <div key={field} className={field === "line1" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input value={newAddr[field as keyof typeof newAddr]}
                      onChange={e => setNewAddr({ ...newAddr, [field as string]: e.target.value })}
                      required={field !== "line2"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <button onClick={saveAddress} disabled={addingAddr}
                    className="bg-[#1a1a2e] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition disabled:opacity-60">
                    {addingAddr ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* Order items */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-gray-900 mb-4">Your Items ({items.length})</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    {item.variant && <p className="text-gray-400 text-xs">{item.variant.name}: {item.variant.value}</p>}
                    <p className="text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-5">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
              <div className="flex justify-between text-gray-600"><span>GST (18%)</span><span>₹{tax}</span></div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing || !selectedAddress || items.length === 0}
              className="mt-6 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold py-4 rounded-2xl transition-all"
            >
              {placing ? "Processing..." : `Pay ₹${grandTotal.toLocaleString("en-IN")}`}
            </button>

            <p className="mt-3 text-xs text-center text-gray-400">🔒 Secured by Razorpay. 256-bit SSL.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
