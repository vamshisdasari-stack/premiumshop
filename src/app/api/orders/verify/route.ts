export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, auditLog } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { sendOrderConfirmationEmail, sendEmailSafe } from "@/lib/resend";
import { ok, badRequest, unauthorized, serverError, validationError } from "@/lib/api-response";

const schema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  try {
    // NEVER trust client-side payment success — always verify server-side signature
    const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!isValid) {
      await auditLog({ userId: user.id, action: "PAYMENT_SIGNATURE_FAILED", metadata: { razorpayOrderId }, req });
      return badRequest("Payment verification failed. Please contact support.", "SIGNATURE_INVALID");
    }

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId, userId: user.id },
      include: { items: true, user: { select: { name: true, email: true } } },
    });

    if (!order) return badRequest("Order not found.");
    if (order.status === "PAID") return ok({ orderNumber: order.orderNumber }, "Payment already confirmed.");

    // Update in a transaction — idempotent
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      await tx.transaction.update({
        where: { razorpayOrderId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: "CAPTURED",
          webhookVerified: false, // Will be confirmed by webhook
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "PAID" },
      });

      // Decrement stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cart: { userId: user.id } },
      });
    });

    // Send confirmation email (fire-and-forget)
    sendEmailSafe(() =>
      sendOrderConfirmationEmail({
        to: order.user.email,
        name: order.user.name,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          name: i.productName,
          variantLabel: i.variantLabel ?? undefined,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.taxAmount),
        total: Number(order.total),
      })
    );

    await auditLog({ userId: user.id, action: "PAYMENT_VERIFIED", entity: "Order", entityId: order.id, req });

    return ok({ orderNumber: order.orderNumber }, "Payment confirmed! Your order is being processed.");
  } catch (err) {
    console.error("[Orders Verify]", err);
    return serverError();
  }
}
