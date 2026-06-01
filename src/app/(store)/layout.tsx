"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface User { id: string; name: string; email: string; role: string; }

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.data ?? null)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (user) {
      fetch("/api/cart").then(r => r.json()).then(d => setCartCount(d.data?.items?.length ?? 0)).catch(() => {});
    }
  }, [user, pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCartCount(0);
    toast.success("Logged out");
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/products", label: "Products" },
    { href: "/products?category=clothing", label: "Clothing" },
    { href: "/products?category=essentials", label: "Essentials" },
    { href: "/products?featured=true", label: "Featured" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Announcement bar */}
      <div className="bg-[#1a1a2e] text-amber-400 text-xs text-center py-2 px-4">
        Free shipping on orders above ₹999 · Use code FIRST10 for 10% off your first order
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-display font-bold text-[#1a1a2e]">
            ✦ <span className="text-amber-500">Premium</span>Shop
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`text-sm font-medium transition-colors ${pathname.startsWith(l.href.split("?")[0] ?? "") ? "text-amber-500" : "text-gray-600 hover:text-gray-900"}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link href="/products?q=" className="hidden sm:block text-gray-400 hover:text-gray-900 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </Link>

            {user ? (
              <>
                <Link href="/orders" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition">Orders</Link>
                <button onClick={handleLogout} className="hidden sm:block text-sm text-gray-400 hover:text-gray-900 transition">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition">Login</Link>
                <Link href="/register" className="hidden sm:block bg-[#1a1a2e] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition">Sign up</Link>
              </>
            )}

            <Link href="/cart" className="relative text-gray-600 hover:text-gray-900 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" /></svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button className="md:hidden text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden">
              <div className="p-4 space-y-2">
                {navLinks.map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 text-gray-700 font-medium">{l.label}</Link>
                ))}
                <div className="border-t border-gray-100 pt-2">
                  {user ? (
                    <>
                      <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-gray-700">Orders</Link>
                      <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block py-2.5 text-red-500">Logout</button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-gray-700">Login</Link>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-gray-700">Sign up</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-gray-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="text-2xl font-display font-bold text-amber-400 mb-3">✦ PremiumShop</div>
              <p className="text-sm">Premium clothing & daily essentials, delivered to your door.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Shop</h4>
              <div className="space-y-2 text-sm">
                <Link href="/products" className="block hover:text-white transition">All Products</Link>
                <Link href="/products?featured=true" className="block hover:text-white transition">Featured</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Account</h4>
              <div className="space-y-2 text-sm">
                <Link href="/login" className="block hover:text-white transition">Login</Link>
                <Link href="/orders" className="block hover:text-white transition">My Orders</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Info</h4>
              <div className="space-y-2 text-sm">
                <span className="block">© {new Date().getFullYear()} PremiumShop</span>
                <span className="block">Secured by Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
