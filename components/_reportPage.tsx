/**
 * Shared shell for every individual report page.
 * Fetches /api/reports with the query-string filters forwarded from the URL,
 * then passes the full API response to the render prop.
 */
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

export type ReportData = {
  period: { from: string; to: string };
  summary: {
    revenue: number; prevRevenue: number; revenueGrowth: number;
    totalTransactions: number; prevTransactions: number; txGrowth: number;
    avgOrderValue: number; prevAvgOrder: number;
    totalDiscount: number; totalTax: number; unitsSold: number;
  };
  dailySeries: { date: string; revenue: number; transactions: number; discount: number }[];
  hourlyDist: { hour: number; revenue: number; count: number }[];
  peakHour: { hour: number; revenue: number; count: number };
  topProducts: { name: string; qty: number; revenue: number; discount: number; transactions: number }[];
  slowMovers: { name: string; qty: number; revenue: number }[];
  cashierStats: { name: string; revenue: number; transactions: number; avgOrder: number; discount: number }[];
  paymentBreakdown: { method: string; total: number; count: number }[];
  stock: {
    stockValue: number; retailValue: number; potentialProfit: number;
    lowStockCount: number; outOfStockCount: number;
    lowStockItems: { name: string; qty: number; min: number; category: string }[];
    outOfStockItems: { name: string; category: string }[];
    stockReceivedValue: number; stockReceivedUnits: number;
  };
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer",
};

export function fmt(n: number) { return `M ${n.toFixed(2)}`; }
export function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }
export { METHOD_LABEL };

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = "text-blue-600 dark:text-blue-400" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Simple table ──────────────────────────────────────────────────────────────
export function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <p className="text-xs text-gray-400 text-center py-6">No data for this period</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-xs text-gray-700 dark:text-slate-200">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export function ReportPage({
  title, orgName, children,
}: {
  title: string; orgName: string; children: (data: ReportData, loading: boolean) => React.ReactNode;
}) {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const qs = new URLSearchParams(router.query as Record<string, string>).toString();
    fetch(`/api/reports${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { if (router.isReady) load(); }, [router.isReady, router.query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft size={14} /> Reports
          </button>
          <span className="text-gray-300 dark:text-slate-600">/</span>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-blue-600 transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <span className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck size={13} /> {orgName}
          </span>
        </div>
      </div>

      {data && (
        <p className="text-xs text-gray-400 dark:text-slate-500">
          Period: {new Date(data.period.from).toLocaleDateString()} – {new Date(data.period.to).toLocaleDateString()}
        </p>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 text-xs text-gray-400">Loading…</div>
      ) : data ? (
        children(data, loading)
      ) : (
        <div className="flex items-center justify-center py-20 text-xs text-red-400">Failed to load report data.</div>
      )}
    </div>
  );
}

// ── getServerSideProps factory ────────────────────────────────────────────────
export function makeGSSP() {
  const fn: GetServerSideProps = async (ctx) => {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    if (!session) return { redirect: { destination: "/login", permanent: false } };
    if (session.user.role !== "ORGANIZATION_ADMIN")
      return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { orgName: session.user.organizationName ?? "" } };
  };
  return fn;
}
