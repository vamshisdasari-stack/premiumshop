export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError, validationError } from "@/lib/api-response";

const schema = z.object({ productId: z.string().cuid() });

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: { product: { select: { id: true, name: true, slug: true, price: true, images: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(items.map((i) => ({ ...i, product: { ...i.product, price: Number(i.product.price) } })));
  } catch (err) { return serverError(); }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  try {
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId: parsed.data.productId } },
      create: { userId: user.id, productId: parsed.data.productId },
      update: {},
    });
    return ok(null, "Added to wishlist.");
  } catch (err) { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return badRequest("productId required");
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
    return ok(null, "Removed from wishlist.");
  } catch (err) { return serverError(); }
}

