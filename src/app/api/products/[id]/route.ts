export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Support both id and slug lookup
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: true,
        reviews: {
          where: { status: "APPROVED" },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product) return notFound("Product not found.");

    const ratings = product.reviews.map((r) => r.rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    return ok({
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      avgRating,
      reviewCount: ratings.length,
    });
  } catch (err) {
    console.error("[Product GET]", err);
    return serverError();
  }
}
