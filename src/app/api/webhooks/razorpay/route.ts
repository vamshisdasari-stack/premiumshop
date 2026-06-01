import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { auditLog } from "@/lib/auth";

// Webhook is the source of truth for payment status — fully idempotent
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: { payment: { entity: Record<string, unknown> } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id as string | undefined;
  const razorpayPaymentId = payment?.id as string | undefined;

  if (!razorpayOrderId) return NextResponse.json({ ok: true }); // Ignore non-order events

  try {
    // Idempotency — check if already processed
    const txn = await prisma.transaction.findUnique({ where: { razorpayOrderId } });
    if (!txn) return NextResponse.json({ ok: true });

    if (event.event === "payment.captured" && !txn.webhookVerified) {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { razorpayOrderId },
          data: {
            status: "CAPTURED",
            webhookVerified: true,
            razorpayPaymentId: razorpayPaymentId ?? undefined,
          },
        });

        await tx.order.update({
          where: { razorpayOrderId },
          data: { status: "PROCESSING" },
        });

        await tx.orderStatusHistory.create({
          data: { orderId: txn.orderId, status: "PROCESSING", note: "Confirmed by Razorpay webhook" },
        });
      });
    } else if (event.event === "payment.failed") {
      await prisma.transaction.update({
        where: { razorpayOrderId },
        data: {
          status: "FAILED",
          failureReason: (payment?.error_description as string) ?? "Payment failed",
        },
      });
      await prisma.order.update({
        where: { razorpayOrderId },
        data: { status: "PENDING" },
      });
    }

    await auditLog({
      action: `WEBHOOK_${event.event.toUpperCase().replace(".", "_")}`,
      entity: "Transaction",
      entityId: txn.id,
      metadata: { razorpayOrderId, razorpayPaymentId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Webhook]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
