"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "🛍️" },
  { href: "/admin/categories", label: "Categories", icon: "🏷️" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logging, setLogging] = useState(false);

  async function handleLogout() {
    setLogging(true);
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/admin/login");
    router.refresh();
    setLogging(false);
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin" className="text-xl font-display font-bold text-amber-400">✦ Admin Panel</Link>
          <p className="text-xs text-gray-500 mt-0.5">PremiumShop</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            disabled={logging}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-all"
          >
            <span>🚪</span> {logging ? "Logging out..." : "Logout"}
          </button>
          <Link
            href="/"
            target="_blank"
            className="mt-1 w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl transition-all"
          >
            <span>🛒</span> View Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
