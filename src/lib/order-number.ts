import { prisma } from "./prisma";

/**
 * Generate a human-friendly, sequential order number.
 * Format: ORD-2024-000001
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `ORD-${year}-${String(count + 1).padStart(6, "0")}`;
}
