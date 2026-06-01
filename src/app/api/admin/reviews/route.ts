export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";
import { auditLog } from "@/lib/auth";
import { ReviewStatus } from "@prisma/client";

const moderateSchema = z.object({
  reviewId: z.string().cuid(),
  status: z.nativeEnum(ReviewStatus),
  moderationNote: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") as ReviewStatus) || ReviewStatus.PENDING;
  const page = Math.max(1, Number(sp.get("page") ?? 1));

  try {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { status },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.review.count({ where: { status } }),
    ]);
    return ok({ reviews, total, page, pages: Math.ceil(total / 20) });
  } catch (err) {
    console.error("[Admin Reviews GET]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const adminId = req.headers.get("x-user-id") ?? "unknown";
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = moderateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { reviewId, status, moderationNote } = parsed.data;

  try {
    await prisma.review.update({ where: { id: reviewId }, data: { status, moderationNote } });
    await auditLog({ userId: adminId, action: `REVIEW_${status}`, entity: "Review", entityId: reviewId });
    return ok(null, `Review ${status.toLowerCase()}.`);
  } catch (err) {
    console.error("[Admin Reviews PATCH]", err);
    return serverError();
  }
}
