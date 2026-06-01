import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "PremiumShop — Clothing & Daily Essentials", template: "%s | PremiumShop" },
  description: "Discover premium clothing, accessories, and daily essentials at PremiumShop.",
  keywords: ["clothing", "fashion", "essentials", "online shopping", "premium"],
  openGraph: {
    type: "website",
    siteName: "PremiumShop",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5c542",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "10px", background: "#1a1a2e", color: "#fff" },
            success: { iconTheme: { primary: "#f5c542", secondary: "#1a1a2e" } },
          }}
        />
      </body>
    </html>
  );
}
