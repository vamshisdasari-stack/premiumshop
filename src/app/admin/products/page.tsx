"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  sku: string | null;
  createdAt: string;
}

interface Category { id: string; name: string; }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", price: "", stock: "", categoryId: "",
    isFeatured: false, isActive: true, tags: "", sku: "",
  });
  const [images, setImages] = useState<FileList | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?page=${page}&limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setProducts(data.data.products);
      setTotal(data.data.total);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/categories").then(r => r.json()).then(d => setCategories(d.data ?? [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!images || images.length === 0) { toast.error("Add at least one image"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.set("isFeatured", String(form.isFeatured));
      fd.set("isActive", String(form.isActive));
      fd.set("tags", JSON.stringify(form.tags.split(",").map(t => t.trim()).filter(Boolean)));
      for (const file of Array.from(images)) fd.append("images", file);

      const res = await fetch("/api/admin/products", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Product created!");
      setShowForm(false);
      setForm({ name: "", description: "", price: "", stock: "", categoryId: "", isFeatured: false, isActive: true, tags: "", sku: "" });
      setImages(null);
      load();
    } catch { toast.error("Error creating product"); }
    finally { setSubmitting(false); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-1">{total} total products</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-5 py-2.5 rounded-xl transition">
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-white mb-5">New Product</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["name", "Product Name", "text"], ["price", "Price (₹)", "number"], ["stock", "Stock", "number"], ["sku", "SKU (optional)", "text"]].map(([field, label, type]) => (
              <div key={field}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input type={type} value={form[field as keyof typeof form] as string}
                  onChange={e => setForm({ ...form, [field as string]: e.target.value })}
                  required={field !== "sku"}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                required rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="summer, casual, cotton" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Images (max 8)</label>
              <input type="file" accept="image/*" multiple onChange={e => setImages(e.target.files)}
                required className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500 file:text-gray-900 file:font-medium" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} className="accent-amber-500" />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-amber-500" />
                Active
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={submitting}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold px-6 py-2.5 rounded-xl transition">
                {submitting ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products..."
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              {["Image", "Product", "Category", "Price", "Stock", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              ))
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  {p.images[0] && <Image src={p.images[0]} alt={p.name} width={48} height={48} className="w-12 h-12 object-cover rounded-lg" />}
                </td>
                <td className="px-4 py-3"><p className="font-medium text-white">{p.name}</p><p className="text-gray-500 text-xs">{p.sku ?? "—"}</p></td>
                <td className="px-4 py-3 text-gray-400">{p.category.name}</td>
                <td className="px-4 py-3 font-medium text-white">₹{p.price.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={p.stock <= 5 ? "text-red-400" : "text-gray-300"}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                  {p.isFeatured && <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">Featured</span>}
                </td>
                <td className="px-4 py-3">
                  <a href={`/products/${p.slug}`} target="_blank" className="text-xs text-amber-400 hover:underline">View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="p-4 border-t border-gray-800 flex justify-center gap-2">
            {[...Array(pages)].map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? "bg-amber-500 text-gray-900 font-bold" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
