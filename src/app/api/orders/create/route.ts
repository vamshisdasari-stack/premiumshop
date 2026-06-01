export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, auditLog } from "@/lib/auth";
import { createRazorpayOrder } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/order-number";
import { ok, badRequest, unauthorized, serverError, validationError } from "@/lib/api-response";

const schema = z.object({
  addressId: z.string().cuid(),
  couponCode: z.string().optional(),
});

const SHIPPING_THRESHOLD = 999; // Free shipping above ₹999
const SHIPPING_COST = 99;
const TAX_RATE = 0.18; // 18% GST

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { addressId } = parsed.data;

  try {
    // Validate address belongs to user
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!address) return badRequest("Invalid delivery address.");

    // Load cart with current DB prices (NEVER trust client prices)
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, images: true, stock: true, isActive: true, deletedAt: true } },
            variant: { select: { id: true, name: true, value: true, priceAdj: true, stock: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) return badRequest("Your cart is empty.");

    // Validate stock and build order items using server-side prices
    for (const item of cart.items) {
      if (!item.product.isActive || item.product.deletedAt) return badRequest(`"${item.product.name}" is no longer available.`);
      if (item.product.stock < item.quantity) return badRequest(`"${item.product.name}" has only ${item.product.stock} items in stock.`);
    }

    // Calculate totals server-side — never trust client
    const subtotal = cart.items.reduce((sum, item) => {
      const base = Number(item.product.price);
      const adj = item.variant ? Number(item.variant.priceAdj) : 0;
      return sum + (base + adj) * item.quantity;
    }, 0);

    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + shippingCost + taxAmount;

    const orderNumber = await generateOrderNumber();

    // Create Razorpay order first
    const rzpOrder = await createRazorpayOrder({
      amount: Math.round(total * 100), // paise
      receipt: orderNumber,
      notes: { userId: user.id, orderNumber },
    });

    // Create DB order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          addressId,
          status: "PAYMENT_PENDING",
          subtotal,
          shippingCost,
          taxAmount,
          total,
          razorpayOrderId: rzpOrder.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min payment window
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? undefined,
              productName: item.product.name,
              variantLabel: item.variant ? `${item.variant.name}: ${item.variant.value}` : undefined,
              imageUrl: item.product.images[0] ?? undefined,
              quantity: item.quantity,
              unitPrice: Number(item.product.price) + (item.variant ? Number(item.variant.priceAdj) : 0),
              totalPrice: (Number(item.product.price) + (item.variant ? Number(item.variant.priceAdj) : 0)) * item.quantity,
            })),
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          orderId: newOrder.id,
          razorpayOrderId: rzpOrder.id,
          amount: total,
          status: "CREATED",
          idempotencyKey: `${orderNumber}-create`,
        },
      });

      // Add order status history
      await tx.orderStatusHistory.create({
        data: { orderId: newOrder.id, status: "PAYMENT_PENDING" },
      });

      return newOrder;
    });

    await auditLog({ userId: user.id, action: "ORDER_CREATED", entity: "Order", entityId: order.id, req });

    return ok({
      orderId: order.id,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: Math.round(total * 100),
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Orders Create]", err);
    return serverError();
  }
}
