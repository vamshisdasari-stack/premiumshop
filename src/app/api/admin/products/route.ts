import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uniqueProductSlug } from "@/lib/slugify";
import { sanitizeRichText } from "@/lib/sanitize";
import { uploadProductImage } from "@/lib/cloudinary";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";
import { auditLog } from "@/lib/auth";

const productSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10),
  descriptionHtml: z.string().optional(),
  price: z.coerce.number().positive(),
  comparePrice: z.coerce.number().positive().optional(),
  categoryId: z.string().cuid(),
  stock: z.coerce.number().int().min(0),
  sku: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().max(100).optional(),
  metaDesc: z.string().max(200).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20)));
  const q = sp.get("q") ?? undefined;

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          deletedAt: null,
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: { deletedAt: null, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) } }),
    ]);

    return ok({ products: products.map((p) => ({ ...p, price: Number(p.price), comparePrice: p.comparePrice ? Number(p.comparePrice) : null })), total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[Admin Products GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get("x-user-id") ?? "unknown";
  let formData: FormData;
  try { formData = await req.formData(); } catch { return badRequest("Expected multipart/form-data"); }

  const rawData = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v])
  );

  const parsed = productSchema.safeParse({
    ...rawData,
    isFeatured: rawData["isFeatured"] === "true",
    isActive: rawData["isActive"] !== "false",
    tags: rawData["tags"] ? JSON.parse(rawData["tags"] as string) : [],
  });

  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const imageFiles = formData.getAll("images") as File[];
  if (imageFiles.length === 0) return badRequest("At least one product image is required.");
  if (imageFiles.length > 8) return badRequest("Maximum 8 images allowed.");

  try {
    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const result = await uploadProductImage(file);
      uploadedUrls.push(result.url);
    }

    const slug = await uniqueProductSlug(parsed.data.name);

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        slug,
        descriptionHtml: parsed.data.descriptionHtml ? sanitizeRichText(parsed.data.descriptionHtml) : undefined,
        price: parsed.data.price,
        comparePrice: parsed.data.comparePrice ?? null,
        images: uploadedUrls,
      },
    });

    await auditLog({ userId: adminId, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id });
    return ok(product, "Product created successfully.");
  } catch (err) {
    console.error("[Admin Products POST]", err);
    return serverError();
  }
}
