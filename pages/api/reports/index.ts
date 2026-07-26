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
  if (!orgId) return res.status(400).json({ error: "organizationId required" });

  const { from, to } = req.query;
  const now = new Date();
  const dateFrom = from ? new Date(String(from)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = to
    ? (() => { const d = new Date(String(to)); d.setHours(23, 59, 59, 999); return d; })()
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const prevFrom = new Date(dateFrom); prevFrom.setMonth(prevFrom.getMonth() - 1);
  const prevTo = new Date(dateTo); prevTo.setMonth(prevTo.getMonth() - 1);

  const where = { organizationId: orgId, saleStatus: "COMPLETED" as const, createdAt: { gte: dateFrom, lte: dateTo } };
  const prevWhere = { organizationId: orgId, saleStatus: "COMPLETED" as const, createdAt: { gte: prevFrom, lte: prevTo } };

  const [
    sales, prevSales,
    topProducts, slowMovers,
    cashierPerf,
    paymentBreakdown,
    allProducts,
    stockReceived,
    categoryBreakdown,
    allProductsFull,
  ] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: true, payments: true, cashier: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.findMany({ where: prevWhere, select: { total: true } }),
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: where },
      _sum: { quantity: true, lineTotal: true, discount: true },
      _count: { id: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 10,
    }),
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: where },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "asc" } },
      take: 5,
    }),
    prisma.sale.groupBy({
      by: ["cashierId"],
      where,
      _sum: { total: true, discount: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { organizationId: orgId, paidAt: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.product.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { name: true, quantity: true, buyingPrice: true, sellingPrice: true, minimumStock: true, category: { select: { name: true } } },
    }),
    prisma.inventoryTransaction.findMany({
      where: { organizationId: orgId, type: "STOCK_IN", createdAt: { gte: dateFrom, lte: dateTo } },
      select: { quantity: true, createdAt: true, performedBy: true, referenceNumber: true, product: { select: { name: true, buyingPrice: true, supplier: true } } },
    }),
    // Category breakdown
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: where },
      _sum: { quantity: true, lineTotal: true },
    }),
    // Full product list for slow-movers, low-stock details
    prisma.product.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { name: true, quantity: true, buyingPrice: true, sellingPrice: true, minimumStock: true, supplier: true, updatedAt: true, category: { select: { name: true } } },
    }),
  ]);

  // Summary
  const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const prevRevenue = prevSales.reduce((s, x) => s + Number(x.total), 0);
  const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
  const totalTax = sales.reduce((s, x) => s + Number(x.tax), 0);
  const unitsSold = sales.reduce((s, x) => s + x.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const avgOrderValue = sales.length > 0 ? revenue / sales.length : 0;
  const prevAvgOrder = prevSales.length > 0 ? prevRevenue / prevSales.length : 0;
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0;
  const txGrowth = prevSales.length > 0 ? ((sales.length - prevSales.length) / prevSales.length) * 100 : 0;

  // Daily series — fill every day in range
  const dailyMap: Record<string, { revenue: number; transactions: number; discount: number }> = {};
  const cursor = new Date(dateFrom);
  while (cursor <= dateTo) {
    dailyMap[cursor.toISOString().slice(0, 10)] = { revenue: 0, transactions: 0, discount: 0 };
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const sale of sales) {
    const key = new Date(sale.createdAt).toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].revenue += Number(sale.total);
      dailyMap[key].transactions += 1;
      dailyMap[key].discount += Number(sale.discount);
    }
  }
  const dailySeries = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

  // Hourly distribution
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, count: 0 }));
  for (const sale of sales) {
    const h = new Date(sale.createdAt).getHours();
    hourBuckets[h].revenue += Number(sale.total);
    hourBuckets[h].count += 1;
  }
  const peakHour = hourBuckets.reduce((best, b) => b.count > best.count ? b : best, hourBuckets[0]);

  // Resolve cashier names — scoped to orgId to prevent cross-org user data leak
  const cashierIds = cashierPerf.map((c) => c.cashierId);
  const cashierUsers = await prisma.user.findMany({
    where: { id: { in: cashierIds }, organizationId: orgId },
    select: { id: true, name: true },
  });
  const cashierMap = Object.fromEntries(cashierUsers.map((u) => [u.id, u.name]));
  const cashierStats = cashierPerf.map((c) => ({
    name: cashierMap[c.cashierId] ?? "Unknown",
    revenue: Number(c._sum.total ?? 0),
    transactions: c._count.id,
    avgOrder: c._count.id > 0 ? Number(c._sum.total ?? 0) / c._count.id : 0,
    discount: Number(c._sum.discount ?? 0),
  }));

  // Stock
  const stockValue = allProducts.reduce((s, p) => s + p.quantity * Number(p.buyingPrice), 0);
  const retailValue = allProducts.reduce((s, p) => s + p.quantity * Number(p.sellingPrice), 0);
  const lowStockItems = allProducts.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock);
  const outOfStockItems = allProducts.filter((p) => p.quantity === 0);
  const stockReceivedValue = stockReceived.reduce((s, t) => s + t.quantity * Number(t.product.buyingPrice), 0);
  const stockReceivedUnits = stockReceived.reduce((s, t) => s + t.quantity, 0);

  // Category breakdown — join saleItem names back to product categories
  const productCategoryMap: Record<string, string> = {};
  for (const p of allProductsFull) productCategoryMap[p.name] = p.category?.name ?? "Uncategorised";
  const catMap: Record<string, { revenue: number; qty: number; transactions: number }> = {};
  for (const item of categoryBreakdown) {
    const cat = productCategoryMap[item.name] ?? "Uncategorised";
    if (!catMap[cat]) catMap[cat] = { revenue: 0, qty: 0, transactions: 0 };
    catMap[cat].revenue += Number(item._sum.lineTotal ?? 0);
    catMap[cat].qty += item._sum.quantity ?? 0;
    catMap[cat].transactions += 1;
  }
  const categoryStats = Object.entries(catMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // Discount breakdown per product
  const discountByProduct = topProducts.map((p) => ({ name: p.name, discount: Number(p._sum?.discount ?? 0), qty: p._sum?.quantity ?? 0 }));

  return res.json({
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    summary: {
      revenue, prevRevenue, revenueGrowth,
      totalTransactions: sales.length, prevTransactions: prevSales.length, txGrowth,
      avgOrderValue, prevAvgOrder,
      totalDiscount, totalTax, unitsSold,
    },
    dailySeries,
    hourlyDist: hourBuckets,
    peakHour,
    topProducts: topProducts.map((p) => ({
      name: p.name,
      qty: p._sum.quantity ?? 0,
      revenue: Number(p._sum.lineTotal ?? 0),
      discount: Number(p._sum.discount ?? 0),
      transactions: p._count.id,
    })),
    slowMovers: slowMovers.map((p) => ({
      name: p.name,
      qty: p._sum.quantity ?? 0,
      revenue: Number(p._sum.lineTotal ?? 0),
    })),
    cashierStats,
    paymentBreakdown: paymentBreakdown.map((p) => ({
      method: p.method,
      total: Number(p._sum.amount ?? 0),
      count: p._count.id,
    })),
    stock: {
      stockValue, retailValue,
      potentialProfit: retailValue - stockValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems: lowStockItems.map((p) => ({ name: p.name, qty: p.quantity, min: p.minimumStock, category: p.category?.name ?? "—", supplier: (p as any).supplier ?? "—" })),
      outOfStockItems: outOfStockItems.map((p) => ({ name: p.name, category: p.category?.name ?? "—", supplier: (p as any).supplier ?? "—", lastUpdated: (p as any).updatedAt })),
      stockReceivedValue, stockReceivedUnits,
      stockReceivedItems: stockReceived.map((t) => ({
        name: t.product.name,
        qty: t.quantity,
        costValue: t.quantity * Number(t.product.buyingPrice),
        supplier: (t.product as any).supplier ?? "—",
        receivedAt: t.createdAt,
        receivedBy: t.performedBy,
        reference: t.referenceNumber ?? "—",
      })),
      allProducts: allProductsFull.map((p) => ({
        name: p.name,
        qty: p.quantity,
        costValue: p.quantity * Number(p.buyingPrice),
        retailValue: p.quantity * Number(p.sellingPrice),
        profit: p.quantity * (Number(p.sellingPrice) - Number(p.buyingPrice)),
        buyingPrice: Number(p.buyingPrice),
        sellingPrice: Number(p.sellingPrice),
        category: p.category?.name ?? "—",
        supplier: p.supplier ?? "—",
        minimumStock: p.minimumStock,
        lastUpdated: p.updatedAt,
      })),
    },
    categoryStats,
    discountByProduct,
  });
}
