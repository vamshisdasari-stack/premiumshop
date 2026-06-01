export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse, API_RATE_LIMIT, SEARCH_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, serverError } from "@/lib/api-response";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(48).default(12),
  category: z.string().optional(),
  q: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc", "popular"]).default("newest"),
  featured: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const limited = rateLimitResponse(req, API_RATE_LIMIT);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const params = querySchema.safeParse(Object.fromEntries(sp));
  if (!params.success) return ok({ products: [], total: 0, page: 1, pages: 0 });

  const { page, limit, category, q, minPrice, maxPrice, sort, featured } = params.data;
  const skip = (page - 1) * limit;

  const where = {
    isActive: true,
    deletedAt: null,
    ...(category ? { category: { slug: category } } : {}),
    ...(featured !== undefined ? { isFeatured: featured } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { tags: { has: q } }] } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
      : {}),
  };

  const orderBy =
    sort === "price_asc" ? { price: "asc" as const }
    : sort === "price_desc" ? { price: "desc" as const }
    : sort === "oldest" ? { createdAt: "asc" as const }
    : { createdAt: "desc" as const };

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true, name: true, slug: true, price: true, comparePrice: true,
          images: true, stock: true, isFeatured: true,
          category: { select: { name: true, slug: true } },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = products.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      return { ...p, price: Number(p.price), comparePrice: p.comparePrice ? Number(p.comparePrice) : null, avgRating, reviewCount: ratings.length };
    });

    return ok({ products: data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[Products GET]", err);
    return serverError();
  }
}
