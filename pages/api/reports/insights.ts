import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const orgId = PLATFORM_ROLES.includes(session.user.role)
    ? Number(req.query.organizationId) || null
    : session.user.organizationId ?? null;
  if (!orgId) return res.status(400).json({ error: "organizationId required" });

  // Last 30 days window
  const now = new Date();
  const from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
  const saleWhere = { organizationId: orgId, saleStatus: "COMPLETED" as const, createdAt: { gte: from } };

  const [topProducts, lowestProducts, lowStock, dailySales, bestCustomers] = await Promise.all([
    // Top 5 by revenue
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: saleWhere },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    // Bottom 5 by revenue (sold at least once)
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: saleWhere },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "asc" } },
      take: 5,
    }),
    // Low stock: active products at or below minimum
    prisma.product.findMany({
      where: { organizationId: orgId, status: "ACTIVE", quantity: { gt: 0 } },
      select: { name: true, quantity: true, minimumStock: true },
      orderBy: { quantity: "asc" },
      take: 5,
    }),
    // Daily revenue for last 30 days
    prisma.sale.findMany({
      where: saleWhere,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Top 5 customers by spend (named only)
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { ...saleWhere, customer: { isWalkIn: false } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  // Build 30-day daily series
  const dayMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const s of dailySales) {
    const key = new Date(s.createdAt).toISOString().slice(0, 10);
    if (dayMap[key] !== undefined) dayMap[key] += Number(s.total);
  }
  const revenueTrend = Object.entries(dayMap).map(([date, revenue]) => ({ date, revenue }));

  // Resolve customer names — scoped to orgId to prevent cross-org data leak
  const customerIds = bestCustomers.map((c) => c.customerId).filter(Boolean) as number[];
  const customerRows = await prisma.customer.findMany({
    where: { id: { in: customerIds }, organizationId: orgId },
    select: { id: true, name: true, customerType: true },
  });
  const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));

  return res.json({
    topProducts: topProducts.map((p) => ({
      name: p.name,
      revenue: Number(p._sum.lineTotal ?? 0),
      qty: p._sum.quantity ?? 0,
    })),
    lowestProducts: lowestProducts.map((p) => ({
      name: p.name,
      revenue: Number(p._sum.lineTotal ?? 0),
      qty: p._sum.quantity ?? 0,
    })),
    lowStock: lowStock
      .filter((p) => p.quantity <= p.minimumStock)
      .map((p) => ({ name: p.name, qty: p.quantity, min: p.minimumStock })),
    revenueTrend,
    bestCustomers: bestCustomers.map((c) => ({
      name: customerMap[c.customerId!]?.name ?? "Unknown",
      customerType: customerMap[c.customerId!]?.customerType ?? "REGULAR",
      revenue: Number(c._sum.total ?? 0),
      visits: c._count.id,
    })),
  });
}
