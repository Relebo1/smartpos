import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../../api/auth/[...nextauth]";
import { useEffect, useState, useCallback } from "react";
import { Search, X, Receipt, Banknote, CreditCard, Smartphone, Building, Printer, CheckCircle } from "lucide-react";
import { printReceipt, downloadReceiptPDF } from "@/lib/receipt";
import { loadSettings } from "@/lib/hardwareSettings";

type SaleItem = { id: number; name: string; quantity: number; unitPrice: string; discount: string; lineTotal: string };
type Payment = { method: string; amount: string; reference: string | null };
type Sale = {
  id: number; receiptNumber: string; total: string; subtotal: string; discount: string; tax: string;
  saleStatus: string; createdAt: string;
  customer: { name: string; isWalkIn: boolean } | null;
  cashier: { name: string };
  payments: Payment[];
  items: SaleItem[];
};

type Props = { orgId: number; orgName: string; orgAddress: string | null; orgPhone: string | null };

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH: <Banknote size={13} />, CARD: <CreditCard size={13} />,
  MOBILE_MONEY: <Smartphone size={13} />, BANK_TRANSFER: <Building size={13} />,
};
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer",
};
const STATUS_CLS: Record<string, string> = {
  COMPLETED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  VOIDED:    "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  REFUNDED:  "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
};

export default function SalesHistoryPage({ orgId, orgName, orgAddress, orgPhone }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      organizationId: String(orgId),
      take: String(PAGE_SIZE),
      skip: String((page - 1) * PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (method) params.set("paymentMethod", method);
    const res = await fetch(`/api/sales?${params}`);
    const data = await res.json();
    setSales(data.sales ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [orgId, page, search, dateFrom, dateTo, method]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  function getOpts() {
    const s = loadSettings();
    return { orgName, orgAddress, orgPhone, paperSize: s.paperSize, footerMessage: s.footerMessage, logoUrl: s.logoUrl, copies: s.printCopies };
  }

  function handlePrint(sale: Sale) {
    printReceipt(sale, getOpts());
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales History — {orgName}</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{total} total transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search receipt #…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
        </div>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
        {(search || dateFrom || dateTo || method) && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setMethod(""); setPage(1); }}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400 dark:text-slate-500">Loading…</div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No sales found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {["Receipt", "Date", "Customer", "Cashier", "Method", "Total", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition cursor-pointer" onClick={() => setSelectedSale(s)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{s.receiptNumber}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString()}{" "}
                    <span className="text-gray-400">{new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-200">
                    {s.customer?.isWalkIn ? <span className="text-gray-400 italic">Walk-in</span> : s.customer?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{s.cashier.name}</td>
                  <td className="px-4 py-3">
                    {s.payments[0] ? (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                        {METHOD_ICON[s.payments[0].method]}{METHOD_LABEL[s.payments[0].method]}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">M {Number(s.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[s.saleStatus] ?? ""}`}>{s.saleStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); handlePrint(s); }}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                      <Printer size={13} /> Reprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                Previous
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedSale(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedSale.receiptNumber}</span>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Date</span><p className="font-medium text-gray-900 dark:text-white">{new Date(selectedSale.createdAt).toLocaleString()}</p></div>
                <div><span className="text-gray-400">Cashier</span><p className="font-medium text-gray-900 dark:text-white">{selectedSale.cashier.name}</p></div>
                <div><span className="text-gray-400">Customer</span><p className="font-medium text-gray-900 dark:text-white">{selectedSale.customer?.isWalkIn ? "Walk-in" : selectedSale.customer?.name ?? "—"}</p></div>
                <div><span className="text-gray-400">Payment</span><p className="font-medium text-gray-900 dark:text-white">{METHOD_LABEL[selectedSale.payments[0]?.method] ?? "—"}</p></div>
              </div>
              <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Items</p>
                {selectedSale.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 text-xs">
                    <span className="text-gray-700 dark:text-slate-200">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                    <span className="font-medium text-gray-900 dark:text-white">M {Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Subtotal</span><span>M {Number(selectedSale.subtotal).toFixed(2)}</span></div>
                {Number(selectedSale.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− M {Number(selectedSale.discount).toFixed(2)}</span></div>}
                {Number(selectedSale.tax) > 0 && <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Tax</span><span>+ M {Number(selectedSale.tax).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-slate-700"><span>Total</span><span>M {Number(selectedSale.total).toFixed(2)}</span></div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
              <button onClick={() => handlePrint(selectedSale)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                <Printer size={15} /> Reprint
              </button>
              <button onClick={() => downloadReceiptPDF(selectedSale, getOpts())}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                <Printer size={15} /> Download PDF
              </button>
              <button onClick={() => setSelectedSale(null)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    if (!id) { const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } }); id = first?.id ?? 0; }
    if (!id) return { redirect: { destination: "/platform", permanent: false } };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return { redirect: { destination: "/platform", permanent: false } };
    orgId = id; orgName = org.name;
  } else {
    orgId = session.user.organizationId!;
    orgName = session.user.organizationName ?? "";
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { address: true, phone: true } });

  return { props: { orgId, orgName, orgAddress: org?.address ?? null, orgPhone: org?.phone ?? null } };
};
