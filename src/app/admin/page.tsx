"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Stats {
  totalRevenue: number;
  monthRevenue: number;
  revenueGrowth: number | null;
  totalOrders: number;
  pendingOrders: number;
  totalUsers: number;
  lowStockProducts: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    user: { name: string; email: string };
    createdAt: string;
  }>;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  PAYMENT_PENDING: "bg-orange-500/20 text-orange-400",
  PAID: "bg-green-500/20 text-green-400",
  PROCESSING: "bg-blue-500/20 text-blue-400",
  SHIPPED: "bg-indigo-500/20 text-indigo-400",
  DELIVERED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

function StatCard({ icon, label, value, sub, href }: { icon: string; label: string; value: string; sub?: string; href?: string }) {
  const content = (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl" />)}
      </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-red-400">Failed to load stats.</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💰" label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`} />
        <StatCard icon="📅" label="This Month" value={`₹${stats.monthRevenue.toLocaleString("en-IN")}`}
          sub={stats.revenueGrowth !== null ? `${stats.revenueGrowth > 0 ? "▲" : "▼"} ${Math.abs(stats.revenueGrowth).toFixed(1)}% vs last month` : undefined}
        />
        <StatCard icon="📦" label="Total Orders" value={String(stats.totalOrders)} sub={`${stats.pendingOrders} pending`} href="/admin/orders" />
        <StatCard icon="👥" label="Customers" value={String(stats.totalUsers)} />
        {stats.lowStockProducts > 0 && (
          <StatCard icon="⚠️" label="Low Stock" value={String(stats.lowStockProducts)} sub="products need restocking" href="/admin/products" />
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-amber-400 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-800">
          {stats.recentOrders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-white">{order.orderNumber}</p>
                <p className="text-xs text-gray-400">{order.user.name} · {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-700 text-gray-300"}`}>
                  {order.status}
                </span>
                <span className="font-bold text-white text-sm">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
