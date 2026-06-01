export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id, status: { not: "PENDING" } },
        include: {
          items: { select: { productName: true, quantity: true, unitPrice: true, imageUrl: true } },
          address: true,
          transaction: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 10,
        take: 10,
      }),
      prisma.order.count({ where: { userId: user.id, status: { not: "PENDING" } } }),
    ]);

    return ok({ orders: orders.map((o) => ({ ...o, total: Number(o.total) })), total, page, pages: Math.ceil(total / 10) });
  } catch (err) {
    console.error("[Account Orders]", err);
    return serverError();
  }
}

