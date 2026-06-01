export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sanitizeReviewText } from "@/lib/sanitize";
import { rateLimitResponse, REVIEW_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, badRequest, unauthorized, serverError, validationError } from "@/lib/api-response";
import { OrderStatus } from "@prisma/client";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(10, "Review must be at least 10 characters").max(2000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimitResponse(req, REVIEW_RATE_LIMIT);
  if (limited) return limited;

  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  try {
    const product = await prisma.product.findFirst({ where: { id: params.id, isActive: true, deletedAt: null } });
    if (!product) return badRequest("Product not found.");

    // Check for verified purchase
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: params.id,
        order: { userId: user.id, status: OrderStatus.DELIVERED },
      },
    });

    const existing = await prisma.review.findUnique({ where: { userId_productId: { userId: user.id, productId: params.id } } });
    if (existing) return badRequest("You have already reviewed this product.");

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId: params.id,
        rating: parsed.data.rating,
        title: parsed.data.title?.trim(),
        body: sanitizeReviewText(parsed.data.body),
        isVerifiedPurchase: !!purchase,
        status: "PENDING",
      },
    });

    return ok(review, "Review submitted for moderation.");
  } catch (err) {
    console.error("[Review POST]", err);
    return serverError();
  }
}
