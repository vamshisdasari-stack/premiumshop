"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  user: { name: string; email: string };
  items: Array<{ productName: string; quantity: number }>;
  createdAt: string;
}

const STATUSES = ["", "PAYMENT_PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUND_REQUESTED", "REFUNDED"];
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  PAYMENT_PENDING: "bg-orange-500/20 text-orange-400",
  PAID: "bg-green-500/20 text-green-400",
  PROCESSING: "bg-blue-500/20 text-blue-400",
  SHIPPED: "bg-indigo-500/20 text-indigo-400",
  DELIVERED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  REFUND_REQUESTED: "bg-purple-500/20 text-purple-400",
  REFUNDED: "bg-gray-500/20 text-gray-400",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/orders?page=${page}${filter ? `&status=${filter}` : ""}`;
      const res = await fetch(url);
      const d = await res.json();
      setOrders(d.data.orders);
      setTotal(d.data.total);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(orderId: string, status: string, note?: string) {
    setUpdating(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, note }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error("Error"); }
    finally { setUpdating(null); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{total} orders</p>
        </div>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          {STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              {["Order", "Customer", "Items", "Total", "Status", "Date", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(10)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 font-mono text-xs text-white">{o.orderNumber}</td>
                <td className="px-4 py-3"><p className="text-white">{o.user.name}</p><p className="text-gray-500 text-xs">{o.user.email}</p></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{o.items.slice(0, 2).map(i => `${i.productName} ×${i.quantity}`).join(", ")}{o.items.length > 2 && " ..."}</td>
                <td className="px-4 py-3 font-bold text-white">₹{o.total.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-700 text-gray-300"}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <select
                    disabled={updating === o.id}
                    onChange={e => e.target.value && updateStatus(o.id, e.target.value)}
                    defaultValue=""
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="">Update...</option>
                    {["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="p-4 border-t border-gray-800 flex justify-center gap-2">
            {[...Array(pages)].map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? "bg-amber-500 text-gray-900 font-bold" : "bg-gray-800 text-gray-400"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
