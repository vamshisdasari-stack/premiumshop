import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError, validationError, notFound } from "@/lib/api-response";
import { auditLog } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

// Valid status transitions (strict state machine)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
  PAYMENT_PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUND_REQUESTED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUND_REQUESTED],
  CANCELLED: [],
  REFUND_REQUESTED: [OrderStatus.REFUNDED],
  REFUNDED: [],
};

const updateSchema = z.object({
  orderId: z.string().cuid(),
  status: z.nativeEnum(OrderStatus),
  note: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20)));
  const status = sp.get("status") as OrderStatus | null;

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { ...(status ? { status } : {}) },
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { quantity: true, productName: true } },
          transaction: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where: { ...(status ? { status } : {}) } }),
    ]);
    return ok({ orders: orders.map((o) => ({ ...o, total: Number(o.total) })), total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[Admin Orders GET]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const adminId = req.headers.get("x-user-id") ?? "unknown";
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { orderId, status, note } = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return notFound("Order not found.");

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return badRequest(`Cannot transition from ${order.status} to ${status}.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status } });
      await tx.orderStatusHistory.create({ data: { orderId, status, note, createdBy: adminId } });
    });

    await auditLog({ userId: adminId, action: "ORDER_STATUS_UPDATED", entity: "Order", entityId: orderId, metadata: { from: order.status, to: status } });
    return ok(null, `Order status updated to ${status}.`);
  } catch (err) {
    console.error("[Admin Orders PATCH]", err);
    return serverError();
  }
}
