export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue,
      monthRevenue,
      prevMonthRevenue,
      totalOrders,
      pendingOrders,
      totalUsers,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: monthStart } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { total: true } }),
      prisma.order.count({ where: { status: { not: "PENDING" } } }),
      prisma.order.count({ where: { status: { in: ["PAYMENT_PENDING", "PAID", "PROCESSING"] } } }),
      prisma.user.count({ where: { deletedAt: null, role: "USER" } }),
      prisma.product.count({ where: { stock: { lte: 5 }, isActive: true, deletedAt: null } }),
      prisma.order.findMany({
        where: { status: { not: "PENDING" } },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const curr = Number(monthRevenue._sum.total ?? 0);
    const prev = Number(prevMonthRevenue._sum.total ?? 0);
    const revenueGrowth = prev === 0 ? null : ((curr - prev) / prev) * 100;

    return ok({
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      monthRevenue: curr,
      revenueGrowth,
      totalOrders,
      pendingOrders,
      totalUsers,
      lowStockProducts,
      recentOrders: recentOrders.map((o) => ({ ...o, total: Number(o.total) })),
    });
  } catch (err) {
    console.error("[Admin Stats]", err);
    return serverError();
  }
}

