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

  const { from, to } = req.query;
  const now = new Date();
  const dateFrom = from ? new Date(String(from)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = to
    ? (() => { const d = new Date(String(to)); d.setHours(23, 59, 59, 999); return d; })()
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const saleWhere = { organizationId: orgId, saleStatus: "COMPLETED" as const, createdAt: { gte: dateFrom, lte: dateTo } };

  const [topCustomersRaw, allSales, customerRows] = await Promise.all([
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { ...saleWhere, customerId: { not: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
    prisma.sale.findMany({
      where: saleWhere,
      select: { customerId: true, customer: { select: { isWalkIn: true, customerType: true } } },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, customerType: true, isWalkIn: true, createdAt: true },
    }),
  ]);

  const customerMap = Object.fromEntries(customerRows.map((c) => [c.id, c]));

  // Top customers
  const topCustomers = topCustomersRaw
    .filter((c) => c.customerId)
    .map((c) => ({
      name: customerMap[c.customerId!]?.name ?? "Unknown",
      customerType: customerMap[c.customerId!]?.customerType ?? "REGULAR",
      revenue: Number(c._sum.total ?? 0),
      visits: c._count.id,
    }));

  // Customer type breakdown
  const typeMap: Record<string, { count: number; revenue: number }> = {};
  for (const sale of allSales) {
    const type = sale.customer?.isWalkIn ? "WALK_IN" : (sale.customer?.customerType ?? "UNKNOWN");
    if (!typeMap[type]) typeMap[type] = { count: 0, revenue: 0 };
    typeMap[type].count += 1;
  }

  // New vs returning — new = first sale in period
  const periodCustomerIds = [...new Set(allSales.map((s) => s.customerId).filter(Boolean))] as number[];
  const firstSaleDates = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { organizationId: orgId, saleStatus: "COMPLETED", customerId: { in: periodCustomerIds } },
    _min: { createdAt: true },
  });
  const firstSaleMap = Object.fromEntries(firstSaleDates.map((r) => [r.customerId, r._min.createdAt]));
  let newCustomers = 0; let returningCustomers = 0;
  for (const cid of periodCustomerIds) {
    const first = firstSaleMap[cid];
    if (first && first >= dateFrom && first <= dateTo) newCustomers++;
    else returningCustomers++;
  }

  // Walk-in vs named
  const walkIn = allSales.filter((s) => s.customer?.isWalkIn || !s.customerId).length;
  const named = allSales.length - walkIn;

  return res.json({
    topCustomers,
    customerTypeBreakdown: Object.entries(typeMap).map(([type, v]) => ({ type, ...v })),
    newVsReturning: { new: newCustomers, returning: returningCustomers },
    walkInVsNamed: { walkIn, named, total: allSales.length },
  });
}
