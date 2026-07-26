import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState } from "react";
import { Download, TrendingUp, CreditCard, Banknote, Smartphone, Building, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

type Stat = { label: string; value: string; sub: string; color: string };

type DailySale = { date: string; revenue: number; count: number };
type TopProduct = { name: string; qty: number; revenue: number };
type PaymentBreakdown = { method: string; count: number; total: number };
type RecentSale = {
  id: number; receiptNumber: string; total: string; createdAt: string;
  customer: { name: string; isWalkIn: boolean } | null;
  cashier: { name: string };
  payments: { method: string }[];
};

type Props = {
  name: string; role: string; organizationName: string;
  stats: Stat[];
  dailySales: DailySale[];
  topProducts: TopProduct[];
  paymentBreakdown: PaymentBreakdown[];
  recentSales: RecentSale[];
  lastMonthRevenue: number;
  thisMonthRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH: <Banknote size={13} />, CARD: <CreditCard size={13} />,
  MOBILE_MONEY: <Smartphone size={13} />, BANK_TRANSFER: <Building size={13} />,
};
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer",
};
const METHOD_COLOR: Record<string, string> = {
  CASH: "bg-green-500", CARD: "bg-blue-500", MOBILE_MONEY: "bg-purple-500", BANK_TRANSFER: "bg-orange-500",
};

function exportExcel(dailySales: DailySale[], topProducts: TopProduct[], recentSales: RecentSale[], paymentBreakdown: PaymentBreakdown[]) {
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Daily Sales
    const dailyData = [
      ["Date", "Revenue (M)", "Transactions"],
      ...dailySales.map((d) => [d.date, d.revenue.toFixed(2), d.count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyData), "Daily Sales");

    // Sheet 2: Top Products
    const prodData = [
      ["Product", "Units Sold", "Revenue (M)"],
      ...topProducts.map((p) => [p.name, p.qty, p.revenue.toFixed(2)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodData), "Top Products");

    // Sheet 3: Payment Methods
    const payData = [
      ["Method", "Transactions", "Total (M)"],
      ...paymentBreakdown.map((p) => [METHOD_LABEL[p.method] ?? p.method, p.count, p.total.toFixed(2)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payData), "Payment Methods");

    // Sheet 4: Recent Sales
    const salesData = [
      ["Receipt", "Date", "Customer", "Cashier", "Method", "Total (M)"],
      ...recentSales.map((s) => [
        s.receiptNumber,
        new Date(s.createdAt).toLocaleString(),
        s.customer?.isWalkIn ? "Walk-in" : s.customer?.name ?? "—",
        s.cashier.name,
        METHOD_LABEL[s.payments[0]?.method] ?? "—",
        Number(s.total).toFixed(2),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesData), "Recent Sales");

    XLSX.writeFile(wb, `dashboard-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
      >
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-gray-100 dark:border-slate-700">{children}</div>}
    </div>
  );
}

// Simple SVG bar chart
function BarChart({ data }: { data: DailySale[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-32 text-xs text-gray-400">No data</div>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const W = 600; const H = 120; const barW = Math.floor((W - 40) / data.length) - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" style={{ height: 160 }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.revenue / max) * H);
        const x = 20 + i * ((W - 40) / data.length);
        const y = H - barH;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} className="fill-blue-500 dark:fill-blue-400" opacity={0.85} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={9} className="fill-gray-400">
              {d.date.slice(5)}
            </text>
            {d.revenue > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} className="fill-gray-500 dark:fill-slate-400">
                {d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue.toFixed(0)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard({
  name, stats, dailySales = [], topProducts = [], paymentBreakdown = [],
  recentSales = [], lastMonthRevenue = 0, thisMonthRevenue = 0, totalCustomers = 0, avgOrderValue = 0,
}: Props) {
  const monthGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : thisMonthRevenue > 0 ? 100 : 0;
  const growthUp = monthGrowth >= 0;
  const payTotal = paymentBreakdown.reduce((s, p) => s + p.total, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Welcome back, <span className="font-medium text-gray-800 dark:text-slate-100">{name}</span>
        </p>
        <button
          onClick={() => exportExcel(dailySales, topProducts, recentSales, paymentBreakdown)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow"
        >
          <Download size={15} /> Export Excel
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Collapsible sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Collapsible title="Month-over-Month">
          <div className="p-5 flex flex-col gap-2">
            <div className="flex items-end gap-3">
              <div>
                <p className="text-xs text-gray-400">Last month</p>
                <p className="text-lg font-bold text-gray-700 dark:text-slate-200">M {lastMonthRevenue.toFixed(2)}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400">This month</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">M {thisMonthRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${growthUp ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {growthUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {Math.abs(monthGrowth).toFixed(1)}% {growthUp ? "growth" : "decline"} vs last month
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Avg Order Value">
          <div className="p-5 flex flex-col gap-2">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">M {avgOrderValue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Per completed transaction (all time)</p>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp size={14} className="text-purple-400" />
              <span className="text-xs text-gray-500 dark:text-slate-400">Based on all completed sales</span>
            </div>
          </div>
        </Collapsible>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Collapsible title="Revenue — Last 7 Days">
            <div className="p-5">
              <BarChart data={dailySales} />
              <div className="flex gap-4 mt-2">
                {dailySales.slice(-3).map((d) => (
                  <div key={d.date} className="text-xs text-gray-400 dark:text-slate-500">
                    <span className="font-medium text-gray-700 dark:text-slate-200">M {d.revenue.toFixed(2)}</span> on {d.date.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          </Collapsible>
        </div>

        <Collapsible title="Payment Methods">
          <div className="p-5">
            {paymentBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No data</p>
            ) : (
              <div className="space-y-3">
                {paymentBreakdown.map((p) => {
                  const pct = payTotal > 0 ? (p.total / payTotal) * 100 : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300">
                          {METHOD_ICON[p.method]}{METHOD_LABEL[p.method] ?? p.method}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">M {p.total.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${METHOD_COLOR[p.method] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{p.count} transaction{p.count !== 1 ? "s" : ""} · {pct.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Collapsible>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Collapsible title="Top Selling Products">
          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No sales yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {["#", "Product", "Units", "Revenue"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white text-xs">{p.name}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">{p.qty}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-green-600 dark:text-green-400">M {p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Collapsible>

        <Collapsible title="Recent Transactions">
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No sales yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {recentSales.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <div>
                    <p className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">{s.receiptNumber}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {s.customer?.isWalkIn ? "Walk-in" : s.customer?.name ?? "—"} · {s.cashier.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">M {Number(s.total).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Collapsible>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(session.user.role)) return { redirect: { destination: "/platform", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const orgId = session.user.organizationId ?? 0;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);

  const [todaySales, monthSales, lastMonthSales, allSales, lowStockItems, topItemsRaw, paymentRaw, recentSales, customerCount] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId: orgId, saleStatus: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } }, select: { total: true, items: { select: { quantity: true } } } }),
    prisma.sale.findMany({ where: { organizationId: orgId, saleStatus: "COMPLETED", createdAt: { gte: monthStart } }, select: { total: true } }),
    prisma.sale.findMany({ where: { organizationId: orgId, saleStatus: "COMPLETED", createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, select: { total: true } }),
    prisma.sale.findMany({ where: { organizationId: orgId, saleStatus: "COMPLETED", createdAt: { gte: sevenDaysAgo } }, select: { total: true, createdAt: true } }),
    prisma.product.findMany({ where: { organizationId: orgId, status: "ACTIVE" }, select: { quantity: true, minimumStock: true } }),
    prisma.saleItem.groupBy({ by: ["name"], where: { sale: { organizationId: orgId, saleStatus: "COMPLETED" } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    prisma.payment.groupBy({ by: ["method"], where: { organizationId: orgId }, _count: { id: true }, _sum: { amount: true } }),
    prisma.sale.findMany({ where: { organizationId: orgId, saleStatus: "COMPLETED" }, include: { customer: { select: { name: true, isWalkIn: true } }, cashier: { select: { name: true } }, payments: { select: { method: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.customer.count({ where: { organizationId: orgId, isWalkIn: false } }),
  ]);

  const todayRevenue = todaySales.reduce((s, sale) => s + Number(sale.total), 0);
  const todayCount = todaySales.length;
  const productsSold = todaySales.reduce((s, sale) => s + sale.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const thisMonthRevenue = monthSales.reduce((s, sale) => s + Number(sale.total), 0);
  const lastMonthRevenue = lastMonthSales.reduce((s, sale) => s + Number(sale.total), 0);
  const lowStock = lowStockItems.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock).length;
  const allRevenue = allSales.reduce((s, sale) => s + Number(sale.total), 0);
  const avgOrderValue = allSales.length > 0 ? allRevenue / allSales.length : 0;

  // Build 7-day daily sales
  const dailyMap: Record<string, { revenue: number; count: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { revenue: 0, count: 0 };
  }
  for (const sale of allSales) {
    const key = new Date(sale.createdAt).toISOString().slice(0, 10);
    if (dailyMap[key]) { dailyMap[key].revenue += Number(sale.total); dailyMap[key].count += 1; }
  }
  const dailySales: DailySale[] = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

  const topProducts: TopProduct[] = topItemsRaw.map((t) => ({
    name: t.name,
    qty: t._sum.quantity ?? 0,
    revenue: Number(t._sum.lineTotal ?? 0),
  }));

  const paymentBreakdown: PaymentBreakdown[] = paymentRaw.map((p) => ({
    method: p.method,
    count: p._count.id,
    total: Number(p._sum.amount ?? 0),
  }));

  const stats: Stat[] = [
    { label: "Today's Sales",   value: `M ${todayRevenue.toFixed(2)}`, sub: `${todayCount} transaction${todayCount !== 1 ? "s" : ""} today`, color: "text-blue-600 dark:text-blue-400" },
    { label: "Products Sold",   value: String(productsSold),           sub: "Units sold today",                                              color: "text-green-600 dark:text-green-400" },
    { label: "Low Stock Items", value: String(lowStock),               sub: "Need restocking",                                               color: "text-orange-500 dark:text-orange-400" },
    { label: "This Month",      value: `M ${thisMonthRevenue.toFixed(2)}`, sub: "Revenue this month",                                        color: "text-purple-600 dark:text-purple-400" },
  ];

  return {
    props: {
      name: session.user.name,
      role: session.user.role,
      organizationName: session.user.organizationName ?? "",
      stats,
      dailySales,
      topProducts,
      paymentBreakdown,
      lastMonthRevenue,
      thisMonthRevenue,
      totalCustomers: customerCount,
      avgOrderValue,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        total: s.total.toString(),
        createdAt: s.createdAt.toISOString(),
        customer: s.customer,
        cashier: s.cashier,
        payments: s.payments,
      })),
    },
  };
};
