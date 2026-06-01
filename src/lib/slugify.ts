import SlugifyLib from "slugify";
import { prisma } from "./prisma";

export function slugify(text: string): string {
  return SlugifyLib(text, { lower: true, strict: true, trim: true });
}

/**
 * Generate a unique slug for a product or category.
 * Appends a numeric suffix if the slug is already taken.
 */
export async function uniqueProductSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function uniqueCategorySlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${counter++}`;
  }
  return slug;
}
