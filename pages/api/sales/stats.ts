import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) return Number(query.organizationId) || null;
  return session.user.organizationId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayWhere = {
    organizationId: orgId,
    saleStatus: "COMPLETED" as const,
    createdAt: { gte: todayStart, lte: todayEnd },
  };

  const [todaySales, totalSales, recentSales] = await Promise.all([
    prisma.sale.findMany({
      where: todayWhere,
      select: { total: true },
    }),
    prisma.sale.count({ where: { organizationId: orgId, saleStatus: "COMPLETED" } }),
    prisma.sale.findMany({
      where: { organizationId: orgId },
      include: {
        customer: { select: { name: true, isWalkIn: true } },
        cashier: { select: { name: true } },
        payments: { select: { method: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const todayRevenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);
  const todayCount = todaySales.length;
  const avgSale = todayCount > 0 ? todayRevenue / todayCount : 0;

  return res.json({
    todayRevenue,
    todayCount,
    avgSale,
    totalSales,
    recentSales: recentSales.map((s) => ({
      ...s,
      subtotal: s.subtotal.toString(),
      discount: s.discount.toString(),
      tax: s.tax.toString(),
      total: s.total.toString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
