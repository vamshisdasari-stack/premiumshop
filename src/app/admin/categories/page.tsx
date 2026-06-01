"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
}

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", isActive: true, sortOrder: 0 });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/categories");
      const d = await res.json();
      setCats(d.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      toast.success("Category created!");
      setForm({ name: "", description: "", isActive: true, sortOrder: 0 });
      load();
    } catch { toast.error("Error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Categories</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5">Add Category</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-amber-500" />
              Active
            </label>
            <button type="submit" disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-xl transition">
              {submitting ? "Creating..." : "Create Category"}
            </button>
          </form>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800"><p className="font-bold text-white">All Categories</p></div>
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {cats.map(cat => (
                <div key={cat.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{cat.name}</p>
                    <p className="text-xs text-gray-500">/{cat.slug} · {cat._count.products} products</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${cat.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                    {cat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
