import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState, useEffect } from "react";
import {
  ChevronDown, TrendingUp, ShoppingCart, Warehouse,
  Users, DollarSign, BarChart2, AlertTriangle, UserCheck, Filter, X,
  ArrowUp, ArrowDown, PackageX, ShieldCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Option = { id: number | string; name?: string; label?: string };

type FilterState = {
  from: string;
  to: string;
  productId: string;
  categoryId: string;
  customerId: string;
  cashierId: string;
  paymentMethod: string;
};

type FilterOptions = {
  products: Option[];
  categories: Option[];
  customers: Option[];
  cashiers: Option[];
  paymentMethods: { id: string; label: string }[];
};

type InsightData = {
  topProducts:    { name: string; revenue: number; qty: number }[];
  lowestProducts: { name: string; revenue: number; qty: number }[];
  lowStock:       { name: string; qty: number; min: number }[];
  revenueTrend:   { date: string; revenue: number }[];
};

type ReportItem = { label: string; description: string; href: string; badge?: string };
type ReportCategory = {
  id: string; label: string; icon: React.ReactNode;
  description: string; reports: ReportItem[];
};

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const W = 200; const H = 40;
  const step = W / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${H - (v / max) * H}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-blue-500 dark:text-blue-400" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Insight cards ─────────────────────────────────────────────────────────────

function InsightsPanel({ data }: { data: InsightData }) {
  const trendValues = data.revenueTrend.map((d) => d.revenue);
  const trendTotal  = trendValues.reduce((s, v) => s + v, 0);
  const midpoint    = Math.floor(trendValues.length / 2);
  const firstHalf   = trendValues.slice(0, midpoint).reduce((s, v) => s + v, 0);
  const secondHalf  = trendValues.slice(midpoint).reduce((s, v) => s + v, 0);
  const trendUp     = secondHalf >= firstHalf;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

      {/* Top Selling Products */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-green-500" />
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Top Selling Products</p>
          <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">30 days</span>
        </div>
        {data.topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No sales data</p>
        ) : (
          <ol className="space-y-2">
            {data.topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300 dark:text-slate-600 w-4">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-700 dark:text-slate-200 truncate">{p.name}</span>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">M {p.revenue.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Lowest Performing Products */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDown size={14} className="text-orange-500" />
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Lowest Performing</p>
          <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">30 days</span>
        </div>
        {data.lowestProducts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No sales data</p>
        ) : (
          <ol className="space-y-2">
            {data.lowestProducts.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300 dark:text-slate-600 w-4">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-700 dark:text-slate-200 truncate">{p.name}</span>
                <span className="text-xs font-semibold text-orange-500 dark:text-orange-400">M {p.revenue.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <PackageX size={14} className="text-red-500" />
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Low Stock Alerts</p>
          {data.lowStock.length > 0 && (
            <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
              {data.lowStock.length}
            </span>
          )}
        </div>
        {data.lowStock.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">All stock levels healthy</p>
        ) : (
          <ul className="space-y-2">
            {data.lowStock.map((p) => (
              <li key={p.name} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-gray-700 dark:text-slate-200 truncate">{p.name}</span>
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{p.qty}</span>
                <span className="text-xs text-gray-400">/ {p.min} min</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Revenue Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 sm:col-span-2 xl:col-span-2">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={14} className="text-blue-500" />
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Revenue Trend</p>
          <span className={`ml-auto flex items-center gap-1 text-xs font-semibold ${
            trendUp ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
          }`}>
            {trendUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trendUp ? "Trending up" : "Trending down"}
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          Total: <span className="font-semibold text-gray-700 dark:text-slate-200">M {trendTotal.toFixed(2)}</span> over last 30 days
        </p>
        <Sparkline data={trendValues} />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{data.revenueTrend[0]?.date?.slice(5) ?? ""}</span>
          <span className="text-xs text-gray-400">{data.revenueTrend[data.revenueTrend.length - 1]?.date?.slice(5) ?? ""}</span>
        </div>
      </div>

    </div>
  );
}

// ── Report categories ─────────────────────────────────────────────────────────

const CATEGORIES: ReportCategory[] = [
  {
    id: "sales", label: "Sales Reports", icon: <TrendingUp size={16} />,
    description: "Revenue, transactions, and sales performance over time",
    reports: [
      { label: "Sales Summary",       description: "Total revenue, transactions, and growth vs prior period", href: "/dashboard/reports/sales-summary" },
      { label: "Daily Sales",         description: "Day-by-day revenue and transaction breakdown",            href: "/dashboard/reports/daily-sales" },
      { label: "Hourly Distribution", description: "Peak trading hours and busiest time slots",              href: "/dashboard/reports/hourly", badge: "Insight" },
    ],
  },
  {
    id: "inventory", label: "Inventory Reports", icon: <Warehouse size={16} />,
    description: "Stock levels, valuation, reorder alerts, and received stock",
    reports: [
      { label: "Stock Valuation",  description: "Current stock value at cost and retail price",        href: "/dashboard/reports/stock-valuation" },
      { label: "Low Stock Alerts", description: "Items at or below their minimum stock threshold",     href: "/dashboard/reports/low-stock", badge: "Alert" },
      { label: "Out of Stock",     description: "Products with zero quantity currently on hand",       href: "/dashboard/reports/out-of-stock", badge: "Alert" },
      { label: "Stock Received",   description: "Inventory received (STOCK_IN) within the period",    href: "/dashboard/reports/stock-received" },
    ],
  },
  {
    id: "products", label: "Product Reports", icon: <ShoppingCart size={16} />,
    description: "Product performance, top sellers, slow movers, and discounts",
    reports: [
      { label: "Top Selling Products", description: "Best performers ranked by revenue and units sold",   href: "/dashboard/reports/top-products" },
      { label: "Slow Movers",          description: "Products with the lowest sales velocity",            href: "/dashboard/reports/slow-movers", badge: "Action" },
      { label: "Discount Analysis",    description: "Discounts applied per product across all sales",     href: "/dashboard/reports/discounts" },
      { label: "Category Breakdown",   description: "Revenue and units sold grouped by product category", href: "/dashboard/reports/category-breakdown" },
    ],
  },
  {
    id: "customers", label: "Customer Reports", icon: <Users size={16} />,
    description: "Customer activity, retention, and purchase behaviour",
    reports: [
      { label: "Top Customers",    description: "Highest-spending named customers by total revenue",       href: "/dashboard/reports/top-customers" },
      { label: "Customer Types",   description: "Sales split by Regular, Wholesale, VIP, and Walk-in",    href: "/dashboard/reports/customer-types" },
      { label: "New vs Returning", description: "First-time buyers compared to repeat customers",         href: "/dashboard/reports/new-vs-returning", badge: "Insight" },
      { label: "Walk-in vs Named", description: "Transaction volume for walk-in vs registered customers", href: "/dashboard/reports/walkin-vs-named" },
    ],
  },
  {
    id: "financial", label: "Financial Reports", icon: <DollarSign size={16} />,
    description: "Revenue, tax, discounts, margins, and payment methods",
    reports: [
      { label: "Revenue Summary", description: "Gross revenue, discounts, tax, and net totals",                 href: "/dashboard/reports/revenue-summary" },
      { label: "Payment Methods", description: "Revenue split by cash, card, mobile money, and bank transfer",  href: "/dashboard/reports/payment-methods" },
      { label: "Gross Margin",    description: "Selling price vs buying price margin per product",              href: "/dashboard/reports/gross-margin", badge: "Insight" },
      { label: "Discount & Tax",  description: "Total discounts given and tax collected within the period",     href: "/dashboard/reports/discount-tax" },
    ],
  },
  {
    id: "employees", label: "Employee Reports", icon: <UserCheck size={16} />,
    description: "Cashier performance, activity, and sales attribution",
    reports: [
      { label: "Cashier Performance", description: "Revenue, transactions, and average order value per cashier", href: "/dashboard/reports/cashier-performance" },
      { label: "Cashier Activity",    description: "Number of shifts and transactions processed per employee",   href: "/dashboard/reports/cashier-activity", badge: "Insight" },
      { label: "Sales by Employee",   description: "Full sales list filtered and attributed by cashier",         href: "/dashboard/reports/sales-by-employee" },
    ],
  },
];

const BADGE_STYLE: Record<string, string> = {
  Insight: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  Alert:   "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  Action:  "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

const EMPTY_FILTERS: FilterState = {
  from: "", to: "", productId: "", categoryId: "",
  customerId: "", cashierId: "", paymentMethod: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function activeCount(filters: FilterState): number {
  return Object.values(filters).filter(Boolean).length;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectFilter({
  label, value, onChange, options, nameKey = "name",
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: Option[]; nameKey?: "name" | "label";
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {(o as any)[nameKey] ?? (o as any).name ?? (o as any).label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReportFilters({
  filters, options, onChange, onReset,
}: {
  filters: FilterState;
  options: FilterOptions | null;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  const count = activeCount(filters);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">Filters</span>
          {count > 0 && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">{count}</span>
          )}
        </div>
        {count > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Date range */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dynamic selects */}
        <SelectFilter
          label="Product" value={filters.productId}
          onChange={(v) => onChange({ productId: v })}
          options={options?.products ?? []}
        />
        <SelectFilter
          label="Category" value={filters.categoryId}
          onChange={(v) => onChange({ categoryId: v })}
          options={options?.categories ?? []}
        />
        <SelectFilter
          label="Customer" value={filters.customerId}
          onChange={(v) => onChange({ customerId: v })}
          options={options?.customers ?? []}
        />
        <SelectFilter
          label="Cashier" value={filters.cashierId}
          onChange={(v) => onChange({ cashierId: v })}
          options={options?.cashiers ?? []}
        />
      </div>

      {/* Payment method — full-width row of pills */}
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Payment Method</p>
        <div className="flex flex-wrap gap-2">
          {(options?.paymentMethods ?? []).map((m) => (
            <button
              key={m.id}
              onClick={() => onChange({ paymentMethod: filters.paymentMethod === m.id ? "" : m.id })}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                filters.paymentMethod === m.id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  category, query,
}: {
  category: ReportCategory; query: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-600 dark:text-blue-400">{category.icon}</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{category.label}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {category.reports.length} report{category.reports.length !== 1 ? "s" : ""}
          </span>
          <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700/60">
          {category.reports.map((report) => (
            <a
              key={report.href}
              href={`${report.href}${query}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition group"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {report.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{report.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {report.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_STYLE[report.badge] ?? ""}`}>
                    {report.badge}
                  </span>
                )}
                <ChevronDown size={14} className="-rotate-90 text-gray-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage({ orgName }: { orgName: string }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [options, setOptions]   = useState<FilterOptions | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);

  useEffect(() => {
    fetch("/api/reports/filters")
      .then((r) => r.json()).then(setOptions).catch(() => {});
    fetch("/api/reports/insights")
      .then((r) => r.json()).then(setInsights).catch(() => {});
  }, []);

  const query = buildQuery(filters);

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={18} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Reports</h1>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Set filters then select a report — filters are applied automatically
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
          <ShieldCheck size={13} />
          <span>{orgName}</span>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        options={options}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Active filter summary */}
      {activeCount(filters) > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.from && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              From: {filters.from}
            </span>
          )}
          {filters.to && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              To: {filters.to}
            </span>
          )}
          {filters.productId && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Product: {options?.products.find((p) => String(p.id) === filters.productId)?.name ?? filters.productId}
            </span>
          )}
          {filters.categoryId && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Category: {options?.categories.find((c) => String(c.id) === filters.categoryId)?.name ?? filters.categoryId}
            </span>
          )}
          {filters.customerId && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Customer: {options?.customers.find((c) => String(c.id) === filters.customerId)?.name ?? filters.customerId}
            </span>
          )}
          {filters.cashierId && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Cashier: {options?.cashiers.find((c) => String(c.id) === filters.cashierId)?.name ?? filters.cashierId}
            </span>
          )}
          {filters.paymentMethod && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Payment: {options?.paymentMethods.find((m) => m.id === filters.paymentMethod)?.label ?? filters.paymentMethod}
            </span>
          )}
        </div>
      )}

      {/* Insights panel */}
      {insights && <InsightsPanel data={insights} />}

      {/* Category sections */}
      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat) => (
          <CategorySection key={cat.id} category={cat} query={query} />
        ))}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== "ORGANIZATION_ADMIN")
    return { redirect: { destination: "/dashboard", permanent: false } };
  return { props: { orgName: session.user.organizationName ?? "" } };
};
