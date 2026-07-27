import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../api/auth/[...nextauth]";
import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/router";
import { Search, AlertTriangle, PackageX, Package, DollarSign, ScanBarcode, Link2 } from "lucide-react";
import Pagination from "@/components/Pagination";
import dynamic from "next/dynamic";
import { usePhoneScanner } from "@/lib/usePhoneScanner";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });
const PhonePairModal = dynamic(() => import("@/components/PhonePairModal"), { ssr: false });

type Category = { id: number; name: string };
type InventoryItem = {
  id: number; name: string; image: string | null; barcode: string | null;
  category: Category | null; quantity: number; minimumStock: number;
  buyingPrice: string; sellingPrice: string;
};
type Transaction = {
  id: number; type: string; quantity: number; reason: string | null;
  referenceNumber: string | null; notes: string | null;
  performedBy: string; createdAt: string;
  product: { name: string };
};
type Props = { items: InventoryItem[]; orgId: number; orgName: string };

const inputCls = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1";

const ADJUST_REASONS = ["Damaged", "Lost", "Expired", "Found", "Correction"];

const TYPE_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  STOCK_IN:            { label: "Received",   color: "text-green-600 dark:text-green-400",  sign: "+" },
  STOCK_OUT:           { label: "Issued",     color: "text-red-600 dark:text-red-400",      sign: "-" },
  ADJUSTMENT_INCREASE: { label: "Adjusted +", color: "text-blue-600 dark:text-blue-400",    sign: "+" },
  ADJUSTMENT_DECREASE: { label: "Adjusted −", color: "text-orange-600 dark:text-orange-400",sign: "-" },
  SALE:                { label: "Sold",       color: "text-red-600 dark:text-red-400",      sign: "-" },
  RETURN:              { label: "Returned",   color: "text-green-600 dark:text-green-400",  sign: "+" },
};

function stockStatus(qty: number, min: number) {
  if (qty === 0) return { label: "Out of Stock", cls: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" };
  if (qty <= min) return { label: "Low Stock",   cls: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" };
  return              { label: "In Stock",       cls: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };
}

export default function InventoryPage({ items: initial, orgId: serverOrgId, orgName: serverOrgName }: Props) {
  const router = useRouter();
  const orgId = Number(router.query.organizationId) || serverOrgId;

  const [items, setItems] = useState(initial);
  const [orgName, setOrgName] = useState(serverOrgName);
  const [tab, setTab] = useState<"inventory" | "history">("inventory");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Receive stock modal
  const [receiveItem, setReceiveItem] = useState<InventoryItem | null>(null);
  const [receiveForm, setReceiveForm] = useState({ quantity: "", referenceNumber: "", notes: "" });
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  // Barcode scanner
  const [scanTarget, setScanTarget] = useState<"receive" | "adjust" | null>(null);
  const [scanError, setScanError] = useState("");
  const [phoneScanTarget, setPhoneScanTarget] = useState<"receive" | "adjust" | null>(null);
  const hidBuffer = useRef("");
  const hidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidTarget = useRef<"receive" | "adjust" | null>(null);

  const phoneScanner = usePhoneScanner(orgId, (barcode) => {
    const found = items.find((i) => i.barcode === barcode);
    const target = phoneScanTarget;
    if (!found) { setScanError(`No product found for barcode "${barcode}"`); return; }
    setScanError("");
    if (target === "receive") {
      setReceiveItem(found); setReceiveError(""); setReceiveForm({ quantity: "", referenceNumber: "", notes: "" });
    } else {
      setAdjustItem(found); setAdjustError(""); setAdjustForm({ adjustmentType: "DECREASE", quantity: "", reason: "Damaged", notes: "" });
    }
  });

  // Adjust stock modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({ adjustmentType: "DECREASE", quantity: "", reason: "Damaged", notes: "" });
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // History
  const [history, setHistory] = useState<Transaction[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPageSize, setHistoryPageSize] = useState(20);

  useEffect(() => {
    setItems(initial);
    setOrgName(serverOrgName);
    setSearch(""); setFilterStatus(""); setPage(1);
    setTab("inventory");
  }, [initial, serverOrgName]);

  // Re-fetch inventory when org changes client-side (platform org switcher)
  useEffect(() => {
    if (!orgId || orgId === serverOrgId) return;
    fetch(`/api/inventory?organizationId=${orgId}`)
      .then((r) => r.json())
      .then((data) => setItems(data.map((p: any) => ({ ...p, buyingPrice: p.buyingPrice.toString(), sellingPrice: p.sellingPrice.toString() }))));
  }, [orgId, serverOrgId]);

  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    const skip = (historyPage - 1) * historyPageSize;
    fetch(`/api/inventory/history?organizationId=${orgId}&take=${historyPageSize}&skip=${skip}`)
      .then((r) => r.json())
      .then((d) => { setHistory(d.transactions); setHistoryTotal(d.total); })
      .finally(() => setHistoryLoading(false));
  }, [tab, historyPage, historyPageSize, orgId]);

  // Summary stats
  const totalProducts = items.length;
  const totalStockValue = items.reduce((s, i) => s + i.quantity * Number(i.buyingPrice), 0);
  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.minimumStock).length;
  const outOfStock = items.filter((i) => i.quantity === 0).length;

  // Filtered list
  const filtered = items.filter((i) => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const status = stockStatus(i.quantity, i.minimumStock).label;
    const matchStatus = !filterStatus || status === filterStatus;
    return matchSearch && matchStatus;
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openReceive = useCallback((item: InventoryItem) => {
    setScanError(""); setReceiveItem(item); setReceiveError(""); setReceiveForm({ quantity: "", referenceNumber: "", notes: "" });
  }, []);

  const openAdjust = useCallback((item: InventoryItem) => {
    setScanError(""); setAdjustItem(item); setAdjustError(""); setAdjustForm({ adjustmentType: "DECREASE", quantity: "", reason: "Damaged", notes: "" });
  }, []);

  // HID (USB/Bluetooth) barcode scanner listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = hidTarget.current;
      if (!target) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter") {
        const code = hidBuffer.current.replace(/[\x00-\x1F\x7F]+/g, "").trim();
        hidBuffer.current = "";
        if (hidTimer.current) clearTimeout(hidTimer.current);
        if (code.length < 4) return;
        const found = items.find((i) => i.barcode === code);
        if (!found) { setScanError(`No product found for barcode "${code}"`); return; }
        setScanError("");
        if (target === "receive") openReceive(found);
        else openAdjust(found);
        return;
      }
      if (e.key.length === 1) {
        hidBuffer.current += e.key;
        if (hidTimer.current) clearTimeout(hidTimer.current);
        hidTimer.current = setTimeout(() => {
          const code = hidBuffer.current.replace(/[\x00-\x1F\x7F]+/g, "").trim();
          hidBuffer.current = "";
          if (code.length < 4) return;
          const found = items.find((i) => i.barcode === code);
          if (!found) { setScanError(`No product found for barcode "${code}"`); return; }
          setScanError("");
          if (target === "receive") openReceive(found);
          else openAdjust(found);
        }, 100);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, openReceive, openAdjust]);

  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    if (!receiveItem) return;
    setReceiveError(""); setReceiveLoading(true);
    try {
      const res = await fetch(`/api/inventory/receive?organizationId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: receiveItem.id, quantity: Number(receiveForm.quantity), referenceNumber: receiveForm.referenceNumber, notes: receiveForm.notes }),
      });
      const data = await res.json();
      if (!res.ok) { setReceiveError(data.error); return; }
      setItems(items.map((i) => i.id === receiveItem.id ? { ...i, quantity: data.quantity } : i));
      setReceiveItem(null);
      setReceiveForm({ quantity: "", referenceNumber: "", notes: "" });
    } catch {
      setReceiveError("Network error. Please try again.");
    } finally {
      setReceiveLoading(false);
    }
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustItem) return;
    setAdjustError(""); setAdjustLoading(true);
    try {
      const res = await fetch(`/api/inventory/adjust?organizationId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: adjustItem.id, adjustmentType: adjustForm.adjustmentType, quantity: Number(adjustForm.quantity), reason: adjustForm.reason, notes: adjustForm.notes }),
      });
      const data = await res.json();
      if (!res.ok) { setAdjustError(data.error); return; }
      setItems(items.map((i) => i.id === adjustItem.id ? { ...i, quantity: data.quantity } : i));
      setAdjustItem(null);
      setAdjustForm({ adjustmentType: "DECREASE", quantity: "", reason: "Damaged", notes: "" });
    } catch {
      setAdjustError("Network error. Please try again.");
    } finally {
      setAdjustLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory — {orgName}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{totalProducts} active products</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setScanError(""); hidTarget.current = "receive"; setScanTarget("receive"); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          >
            <ScanBarcode size={15} /> Scan to Receive
          </button>
          <button
            onClick={() => { setScanError(""); hidTarget.current = "adjust"; setScanTarget("adjust"); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          >
            <ScanBarcode size={15} /> Scan to Adjust
          </button>
          <div className="flex items-center gap-1">
            {phoneScanner.token && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Phone connected
              </span>
            )}
            <button
              onClick={() => { setScanError(""); hidTarget.current = "receive"; setPhoneScanTarget("receive"); phoneScanner.connect(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
            >
              <Link2 size={15} /> Phone Receive
            </button>
            <button
              onClick={() => { setScanError(""); hidTarget.current = "adjust"; setPhoneScanTarget("adjust"); phoneScanner.connect(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
            >
              <Link2 size={15} /> Phone Adjust
            </button>
          </div>
        </div>
      </div>

      {scanError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">
          {scanError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Products",    value: totalProducts,                    color: "text-blue-600 dark:text-blue-400",   icon: <Package size={18} /> },
          { label: "Stock Value",       value: `M${totalStockValue.toFixed(2)}`, color: "text-green-600 dark:text-green-400", icon: <DollarSign size={18} /> },
          { label: "Low Stock Items",   value: lowStock,                         color: "text-yellow-600 dark:text-yellow-400",icon: <AlertTriangle size={18} /> },
          { label: "Out of Stock",      value: outOfStock,                       color: "text-red-600 dark:text-red-400",     icon: <PackageX size={18} /> },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-slate-700">
        {(["inventory", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              tab === t ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}
          >{t}</button>
        ))}
      </div>

      {tab === "inventory" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search products..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>

          {/* Inventory table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  {["Product", "Category", "Available", "Min Stock", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {paged.map((item) => {
                  const { label, cls } = stockStatus(item.quantity, item.minimumStock);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover shrink-0" />
                            : <div className="w-7 h-7 rounded bg-gray-100 dark:bg-slate-700 shrink-0" />}
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{item.category?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${item.quantity === 0 ? "text-red-600 dark:text-red-400" : item.quantity <= item.minimumStock ? "text-yellow-600 dark:text-yellow-400" : "text-gray-900 dark:text-white"}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{item.minimumStock}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openReceive(item)}
                            className="px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                            Receive
                          </button>
                          <button onClick={() => openAdjust(item)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No products found</td></tr>
                )}
              </tbody>
            </table>
            <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                {["Date", "Product", "Action", "Qty", "Reason", "Performed By"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {historyLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No transactions yet</td></tr>
              ) : history.map((t) => {
                const meta = TYPE_LABELS[t.type] ?? { label: t.type, color: "text-gray-600", sign: "" };
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}{" "}
                      <span className="text-xs">{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.product.name}</td>
                    <td className={`px-4 py-3 font-medium ${meta.color}`}>{meta.label}</td>
                    <td className={`px-4 py-3 font-semibold ${meta.color}`}>{meta.sign}{t.quantity}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{t.reason ?? t.referenceNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{t.performedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination total={historyTotal} page={historyPage} pageSize={historyPageSize} onPageChange={setHistoryPage} onPageSizeChange={(s) => { setHistoryPageSize(s); setHistoryPage(1); }} />
        </div>
      )}

      {scanTarget && (
        <BarcodeScanner
          onDetected={(barcode) => {
            const found = items.find((i) => i.barcode === barcode);
            const target = scanTarget;
            setScanTarget(null);
            hidTarget.current = null;
            if (!found) { setScanError(`No product found for barcode "${barcode}"`); return; }
            if (target === "receive") openReceive(found);
            else openAdjust(found);
          }}
          onClose={() => { setScanTarget(null); hidTarget.current = null; }}
        />
      )}
      {phoneScanner.token && (
        <PhonePairModal
          token={phoneScanner.token}
          orgId={orgId}
          onClose={phoneScanner.disconnect}
        />
      )}

      {/* Receive Stock Modal */}
      {receiveItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Receive Stock</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {receiveItem.name} — Current stock: <span className="font-semibold">{receiveItem.quantity}</span>
            </p>
            <form onSubmit={handleReceive} className="space-y-3">
              <div>
                <label className={labelCls}>Quantity Received *</label>
                <input required type="number" min="1" value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                  className={inputCls} placeholder="100" autoFocus />
              </div>
              <div>
                <label className={labelCls}>Reference Number</label>
                <input value={receiveForm.referenceNumber}
                  onChange={(e) => setReceiveForm({ ...receiveForm, referenceNumber: e.target.value })}
                  className={inputCls} placeholder="PO-001" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  className={inputCls} rows={2} placeholder="Optional notes" />
              </div>
              {receiveError && <p className="text-sm text-red-500 dark:text-red-400">{receiveError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={receiveLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
                  {receiveLoading ? "Saving..." : "Receive Stock"}
                </button>
                <button type="button" onClick={() => setReceiveItem(null)}
                  className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Stock Adjustment</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {adjustItem.name} — Current stock: <span className="font-semibold">{adjustItem.quantity}</span>
            </p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className={labelCls}>Adjustment Type *</label>
                <select value={adjustForm.adjustmentType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}
                  className={inputCls}>
                  <option value="INCREASE">Increase</option>
                  <option value="DECREASE">Decrease</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantity *</label>
                <input required type="number" min="1" value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className={inputCls} placeholder="5" autoFocus />
              </div>
              <div>
                <label className={labelCls}>Reason *</label>
                <select value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className={inputCls}>
                  {ADJUST_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className={inputCls} rows={2} placeholder="Optional notes" />
              </div>
              {adjustError && <p className="text-sm text-red-500 dark:text-red-400">{adjustError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={adjustLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
                  {adjustLoading ? "Saving..." : "Save Adjustment"}
                </button>
                <button type="button" onClick={() => setAdjustItem(null)}
                  className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const isPlatform = PLATFORM_ROLES.includes(session.user.role);
  const { prisma } = await import("@/lib/prisma");

  let orgId: number;
  let orgName: string;

  if (isPlatform) {
    let id = Number(context.query.organizationId) || 0;
    if (!id) {
      const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
      id = first?.id ?? 0;
    }
    if (!id) return { redirect: { destination: "/platform", permanent: false } };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return { redirect: { destination: "/platform", permanent: false } };
    orgId = id; orgName = org.name;
  } else {
    orgId = session.user.organizationId!;
    orgName = session.user.organizationName ?? "";
  }

  const items = await prisma.product.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return {
    props: {
      orgId, orgName,
      items: items.map((p) => ({
        ...p,
        barcode: p.barcode ?? null,
        buyingPrice: p.buyingPrice.toString(),
        sellingPrice: p.sellingPrice.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
  };
};
