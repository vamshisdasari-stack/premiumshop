import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <p className="text-6xl font-display font-bold text-amber-500 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="inline-block bg-[#1a1a2e] text-white font-semibold px-8 py-3 rounded-2xl hover:bg-gray-800 transition">
          Go Home
        </Link>
      </div>
    </div>
  );
}
