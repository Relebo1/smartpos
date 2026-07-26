import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../../api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  ShoppingCart, TrendingUp, Receipt, BarChart2,
  ArrowRight, CreditCard, Smartphone, Banknote, Building,
} from "lucide-react";

type RecentSale = {
  id: number;
  receiptNumber: string;
  total: string;
  saleStatus: string;
  createdAt: string;
  customer: { name: string; isWalkIn: boolean } | null;
  cashier: { name: string };
  payments: { method: string }[];
};

type Stats = {
  todayRevenue: number;
  todayCount: number;
  avgSale: number;
  totalSales: number;
  recentSales: RecentSale[];
};

type Props = { orgId: number; orgName: string };

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH:          <Banknote size={13} />,
  CARD:          <CreditCard size={13} />,
  MOBILE_MONEY:  <Smartphone size={13} />,
  BANK_TRANSFER: <Building size={13} />,
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer",
};

const STATUS_CLS: Record<string, string> = {
  COMPLETED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  VOIDED:    "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  REFUNDED:  "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
};

export default function SalesIndex({ orgId, orgName }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/stats?organizationId=${orgId}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [orgId]);

  const cards = stats
    ? [
        {
          label: "Today's Revenue",
          value: `M ${stats.todayRevenue.toFixed(2)}`,
          sub: `${stats.todayCount} transaction${stats.todayCount !== 1 ? "s" : ""} today`,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          icon: <TrendingUp size={20} />,
        },
        {
          label: "Transactions Today",
          value: String(stats.todayCount),
          sub: `${stats.totalSales} total all-time`,
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-900/20",
          icon: <Receipt size={20} />,
        },
        {
          label: "Average Sale",
          value: `M ${stats.avgSale.toFixed(2)}`,
          sub: "Today's average",
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-900/20",
          icon: <BarChart2 size={20} />,
        },
        {
          label: "Total Sales",
          value: String(stats.totalSales),
          sub: "All completed sales",
          color: "text-orange-600 dark:text-orange-400",
          bg: "bg-orange-50 dark:bg-orange-900/20",
          icon: <ShoppingCart size={20} />,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sales — {orgName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Point of Sale &amp; transaction history
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/sales/pos?organizationId=${orgId}`)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow transition"
        >
          <ShoppingCart size={16} />
          Open POS
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow p-5 animate-pulse h-24" />
            ))
          : cards.map((c) => (
              <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl shadow p-5 flex items-start gap-4">
                <div className={`${c.bg} ${c.color} p-2.5 rounded-lg shrink-0`}>{c.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color} leading-tight`}>{c.value}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{c.sub}</p>
                </div>
              </div>
            ))}
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <button
            onClick={() => router.push(`/dashboard/sales/history?organizationId=${orgId}`)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400 dark:text-slate-500">Loading...</div>
        ) : !stats?.recentSales.length ? (
          <div className="p-10 text-center">
            <ShoppingCart size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No sales yet</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Open the POS to process your first sale
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {["Receipt", "Customer", "Cashier", "Method", "Total", "Status", "Time"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {stats.recentSales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                    {s.receiptNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-200">
                    {s.customer?.isWalkIn ? (
                      <span className="text-gray-400 dark:text-slate-500 italic">Walk-in</span>
                    ) : (
                      s.customer?.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{s.cashier.name}</td>
                  <td className="px-4 py-3">
                    {s.payments[0] ? (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                        {METHOD_ICON[s.payments[0].method]}
                        {METHOD_LABEL[s.payments[0].method]}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    M {Number(s.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[s.saleStatus] ?? ""}`}>
                      {s.saleStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const isPlatform = PLATFORM_ROLES.includes(session.user.role);

  let orgId: number;
  let orgName: string;

  if (isPlatform) {
    let id = Number(ctx.query.organizationId) || 0;
    if (!id) {
      const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
      id = first?.id ?? 0;
    }
    if (!id) return { redirect: { destination: "/platform", permanent: false } };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return { redirect: { destination: "/platform", permanent: false } };
    orgId = id;
    orgName = org.name;
  } else {
    orgId = session.user.organizationId!;
    orgName = session.user.organizationName ?? "";
  }

  return { props: { orgId, orgName } };
};
