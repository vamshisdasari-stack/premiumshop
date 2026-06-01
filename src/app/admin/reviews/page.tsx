"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  isVerifiedPurchase: boolean;
  user: { name: string; email: string };
  product: { name: string; slug: string };
  createdAt: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${filter}`);
      const d = await res.json();
      setReviews(d.data.reviews);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function moderate(reviewId: string, status: string) {
    setUpdating(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, status }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      toast.success(`Review ${status.toLowerCase()}`);
      load();
    } catch { toast.error("Error"); }
    finally { setUpdating(null); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === s ? "bg-amber-500 text-gray-900" : "bg-gray-900 border border-gray-800 text-gray-400"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    {r.isVerifiedPurchase && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Verified Purchase</span>}
                  </div>
                  {r.title && <p className="font-medium text-white mb-1">{r.title}</p>}
                  <p className="text-gray-300 text-sm">{r.body}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    By {r.user.name} · on <a href={`/products/${r.product.slug}`} className="text-amber-400 hover:underline">{r.product.name}</a> · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {filter === "PENDING" && (
                  <div className="flex gap-2">
                    <button onClick={() => moderate(r.id, "APPROVED")} disabled={updating === r.id}
                      className="bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => moderate(r.id, "REJECTED")} disabled={updating === r.id}
                      className="bg-red-800 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loading && reviews.length === 0 && <p className="text-gray-500 text-center py-12">No {filter.toLowerCase()} reviews.</p>}
        </div>
      )}
    </div>
  );
}
