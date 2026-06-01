export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError, validationError, notFound } from "@/lib/api-response";

const addSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(10),
});

const updateSchema = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.number().int().min(0).max(10),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, price: true, images: true, stock: true } },
            variant: true,
          },
        },
      },
    });

    if (!cart) return ok({ items: [], total: 0 });

    const items = cart.items.map((item) => ({
      ...item,
      product: { ...item.product, price: Number(item.product.price) },
    }));

    const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
    return ok({ items, total });
  } catch (err) {
    console.error("[Cart GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { productId, variantId, quantity } = parsed.data;

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
    });
    if (!product) return notFound("Product not found.");
    if (product.stock < quantity) return badRequest(`Only ${product.stock} items in stock.`);

    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId ?? "" } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) return badRequest(`Only ${product.stock} items in stock.`);
      await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
      });
    }

    return ok(null, "Item added to cart.");
  } catch (err) {
    console.error("[Cart POST]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { cartItemId, quantity } = parsed.data;

  try {
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) return notFound("Cart not found.");

    const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, cartId: cart.id } });
    if (!item) return notFound("Item not found.");

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    }

    return ok(null, "Cart updated.");
  } catch (err) {
    console.error("[Cart PATCH]", err);
    return serverError();
  }
}

