import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uniqueCategorySlug } from "@/lib/slugify";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";
import { auditLog } from "@/lib/auth";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  metaTitle: z.string().max(100).optional(),
  metaDesc: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return ok(categories);
  } catch (err) {
    console.error("[Admin Categories GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get("x-user-id") ?? "unknown";
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  try {
    const slug = await uniqueCategorySlug(parsed.data.name);
    const category = await prisma.category.create({ data: { ...parsed.data, slug } });
    await auditLog({ userId: adminId, action: "CATEGORY_CREATED", entity: "Category", entityId: category.id });
    return ok(category, "Category created.");
  } catch (err) {
    console.error("[Admin Categories POST]", err);
    return serverError();
  }
}
