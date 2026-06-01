"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; imageUrl: string | null }>;
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  PAYMENT_PENDING: { label: "Payment Pending", color: "text-orange-600 bg-orange-50", icon: "⏳" },
  PAID: { label: "Confirmed", color: "text-green-600 bg-green-50", icon: "✅" },
  PROCESSING: { label: "Processing", color: "text-blue-600 bg-blue-50", icon: "⚙️" },
  SHIPPED: { label: "Shipped", color: "text-indigo-600 bg-indigo-50", icon: "🚚" },
  DELIVERED: { label: "Delivered", color: "text-emerald-600 bg-emerald-50", icon: "📦" },
  CANCELLED: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: "❌" },
  REFUND_REQUESTED: { label: "Refund Requested", color: "text-purple-600 bg-purple-50", icon: "↩️" },
  REFUNDED: { label: "Refunded", color: "text-gray-600 bg-gray-100", icon: "💸" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/account/orders")
      .then(res => {
        if (res.status === 401) { router.push("/login?redirect=/orders"); return null; }
        return res.json();
      })
      .then(data => { if (data) setOrders(data.data.orders ?? []); })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse mb-4" />)}
    </div>
  );

  if (orders.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="text-7xl mb-6">📦</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h2>
      <p className="text-gray-500 mb-8">Once you place an order, it will appear here.</p>
      <Link href="/products" className="inline-block bg-[#1a1a2e] text-white font-semibold px-8 py-3 rounded-2xl hover:bg-gray-800 transition">
        Start Shopping
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-8">My Orders</h1>

      <div className="space-y-5">
        {orders.map(order => {
          const statusInfo = STATUS_LABEL[order.status] ?? { label: order.status, color: "text-gray-600 bg-gray-50", icon: "📋" };
          return (
            <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${statusInfo.color}`}>
                    <span>{statusInfo.icon}</span>{statusInfo.label}
                  </span>
                  <span className="font-bold text-gray-900">₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span className="line-clamp-1">{item.productName} × {item.quantity}</span>
                      <span className="font-medium text-gray-900">₹{(Number(item.unitPrice) * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
