"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h2>
        <p className="text-gray-500 mb-6">An unexpected error occurred. Please try again.</p>
        <button onClick={reset} className="bg-[#1a1a2e] text-white font-semibold px-6 py-3 rounded-2xl hover:bg-gray-800 transition">
          Try Again
        </button>
      </div>
    </div>
  );
}
