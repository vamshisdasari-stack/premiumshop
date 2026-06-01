import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/products/", "/products"], disallow: ["/admin/", "/api/", "/checkout", "/orders", "/account"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
