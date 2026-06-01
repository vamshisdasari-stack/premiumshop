import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import ProductActions from "@/components/store/ProductActions";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  tags: string[];
  category: { name: string; slug: string };
  variants: Array<{ id: string; name: string; value: string; priceAdj: number; stock: number }>;
  avgRating: number | null;
  reviewCount: number;
  reviews: Array<{ id: string; rating: number; title: string | null; body: string; isVerifiedPurchase: boolean; user: { name: string }; createdAt: string }>;
  metaTitle: string | null;
  metaDesc: string | null;
}

async function getProduct(slug: string): Promise<Product | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/products/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDesc ?? product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [{ url: product.images[0], width: 1200, height: 1200 }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: product.stock > 0 ? "InStock" : "OutOfStock",
    },
    aggregateRating: product.avgRating ? {
      "@type": "AggregateRating",
      ratingValue: product.avgRating.toFixed(1),
      reviewCount: product.reviewCount,
    } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square relative bg-gray-100 rounded-3xl overflow-hidden">
              <Image
                src={product.images[0] ?? "/placeholder.jpg"}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(1, 5).map((img, i) => (
                  <div key={i} className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
                    <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" sizes="25vw" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-sm text-amber-600 font-medium mb-2">{product.category.name}</p>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-3">{product.name}</h1>

            {product.avgRating !== null && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400">{"★".repeat(Math.round(product.avgRating))}{"☆".repeat(5 - Math.round(product.avgRating))}</div>
                <span className="text-sm text-gray-500">{product.avgRating.toFixed(1)} ({product.reviewCount} reviews)</span>
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString("en-IN")}</span>
              {product.comparePrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">₹{product.comparePrice.toLocaleString("en-IN")}</span>
                  <span className="bg-amber-100 text-amber-700 text-sm font-bold px-2 py-0.5 rounded-lg">{discount}% OFF</span>
                </>
              )}
            </div>

            <ProductActions product={product} />

            {/* Description */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">About this product</h3>
              {product.descriptionHtml ? (
                <div className="prose prose-sm text-gray-600" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              )}
            </div>

            {product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        {product.reviews.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-8">Customer Reviews</h2>
            <div className="grid gap-4">
              {product.reviews.map(review => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-400">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        {review.isVerifiedPurchase && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Verified Purchase</span>
                        )}
                      </div>
                      {review.title && <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>}
                      <p className="text-gray-600 text-sm">{review.body}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400 flex-shrink-0">
                      <p className="font-medium text-gray-700">{review.user.name}</p>
                      <p>{new Date(review.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
