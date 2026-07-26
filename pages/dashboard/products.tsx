import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../api/auth/[...nextauth]";
import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/router";
import { Search, ScanBarcode, X, RefreshCw, Printer, Link2 } from "lucide-react";
import Pagination from "@/components/Pagination";
import dynamic from "next/dynamic";
import { usePhoneScanner } from "@/lib/usePhoneScanner";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });
const PhonePairModal = dynamic(() => import("@/components/PhonePairModal"), { ssr: false });

type Category = { id: number; name: string };
type Product = {
  id: number; name: string; description: string | null; barcode: string | null;
  category: Category | null; supplier: string | null;
  buyingPrice: string; sellingPrice: string;
  quantity: number; minimumStock: number;
  image: string | null; status: string; createdAt: string;
};
type Props = { products: Product[]; orgId: number; orgName: string; isPlatform: boolean };

const EMPTY_FORM = {
  name: "", description: "", barcode: "", categoryName: "",
  supplier: "", buyingPrice: "", sellingPrice: "",
  quantity: "0", minimumStock: "0", image: "",
};

const inputCls = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1";

const statusColor: Record<string, string> = {
  ACTIVE:   "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  INACTIVE: "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400",
};

export default function ProductsPage({ products: initial, orgId: serverOrgId, orgName: serverOrgName, isPlatform }: Props) {
  const router = useRouter();
  const orgId = Number(router.query.organizationId) || serverOrgId;

  const [products, setProducts] = useState(initial);
  const [orgName, setOrgName] = useState(serverOrgName);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toggleId, setToggleId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMiss, setScanMiss] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  function handleScannedBarcode(barcode: string) {
    const found = products.find((p) => p.barcode === barcode);
    if (found) { setScanMiss(null); setViewProduct(found); }
    else setScanMiss(barcode);
  }

  const phoneScanner = usePhoneScanner(orgId, handleScannedBarcode);

  // Sync when server props change (org switch)
  useEffect(() => {
    setProducts(initial);
    setOrgName(serverOrgName);
    setSearch("");
    setFilterCategory("");
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
    setPage(1);
  }, [initial, serverOrgName]);

  // Load categories once
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  function openAdd(barcode = "") { setEditId(null); setForm({ ...EMPTY_FORM, barcode }); setImagePreview(""); setError(""); setShowForm(true); }
  function generateBarcode() { setForm((f) => ({ ...f, barcode: Date.now().toString().slice(-13).padStart(13, "0") })); }
  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description ?? "", barcode: p.barcode ?? "",
      categoryName: p.category?.name ?? "", supplier: p.supplier ?? "",
      buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice,
      quantity: String(p.quantity), minimumStock: String(p.minimumStock),
      image: p.image ?? "",
    });
    setImagePreview(p.image ?? "");
    setError(""); setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setImagePreview(""); setError(""); }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) return setError(data.error ?? "Upload failed");
    setForm((f) => ({ ...f, image: data.url }));
    setImagePreview(data.url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const isEdit = editId !== null;
    const url = isEdit ? `/api/products/${editId}` : `/api/products?organizationId=${orgId}`;
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), minimumStock: Number(form.minimumStock) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setProducts(isEdit ? products.map((p) => (p.id === editId ? data : p)) : [data, ...products]);
    // Refresh categories list in case a new one was created
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
    cancelForm();
  }

  async function handleToggle() {
    if (!toggleId) return;
    const res = await fetch(`/api/products/${toggleId}`, { method: "PATCH" });
    const data = await res.json();
    if (res.ok) setProducts(products.map((p) => (p.id === toggleId ? data : p)));
    setToggleId(null);
  }

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.category?.name === filterCategory;
    return matchSearch && matchCat;
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category?.name).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Products — {orgName}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setScanMiss(null); setShowScanner(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          >
            <ScanBarcode size={15} /> Scan to View
          </button>
          {phoneScanner.token && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Phone connected
            </span>
          )}
          <button
            onClick={() => { setScanMiss(null); phoneScanner.connect(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          >
            <Link2 size={15} /> Phone Scan
          </button>
          <button onClick={() => openAdd()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Add Product
          </button>
        </div>
      </div>

      {scanMiss && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-4">
          <span>No product found for barcode &ldquo;{scanMiss}&rdquo;</span>
          <button
            onClick={() => { setScanMiss(null); openAdd(scanMiss); }}
            className="shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
          >
            + Create Product
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{editId ? "Edit Product" : "New Product"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Product Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Coca Cola 500ml" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                list="categories-list"
                value={form.categoryName}
                onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                className={inputCls}
                placeholder="Drinks"
              />
              <datalist id="categories-list">
                {categories.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Barcode</label>
              <div className="flex gap-2">
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputCls} placeholder="6001234567890" />
                <button type="button" onClick={generateBarcode} title="Generate barcode"
                  className="shrink-0 px-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Buying Price (M) *</label>
              <input required type="number" step="0.01" min="0" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} className={inputCls} placeholder="8.00" />
            </div>
            <div>
              <label className={labelCls}>Selling Price (M) *</label>
              <input required type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className={inputCls} placeholder="12.00" />
            </div>
            <div>
              <label className={labelCls}>Initial Quantity</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} placeholder="100" />
            </div>
            <div>
              <label className={labelCls}>Minimum Stock Level</label>
              <input type="number" min="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} className={inputCls} placeholder="10" />
            </div>
            <div>
              <label className={labelCls}>Supplier</label>
              <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputCls} placeholder="ABC Distributors" />
            </div>
            <div>
              <label className={labelCls}>Product Image</label>
              <div className="flex items-center gap-3">
                {imagePreview && (
                  <img src={imagePreview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-slate-600 shrink-0" />
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border border-dashed border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : imagePreview ? "Change image" : "Choose image"}
                  </button>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} placeholder="Optional product description" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
              {loading ? "Saving..." : editId ? "Update Product" : "Create Product"}
            </button>
            <button type="button" onClick={cancelForm} className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              {["Product Name", "Category", "Buying", "Selling", "Stock", "Min Stock", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {paged.map((p) => (
              <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${p.status === "INACTIVE" ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center gap-3">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                      : <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-700 shrink-0" />}
                    <div>
                      <div>{p.name}</div>
                      {p.barcode && <div className="text-xs text-gray-400 dark:text-slate-500">{p.barcode}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">M{Number(p.buyingPrice).toFixed(2)}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">M{Number(p.sellingPrice).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${p.quantity <= p.minimumStock ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                    {p.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{p.minimumStock}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                      Edit
                    </button>
                    {p.barcode && (
                      <button onClick={() => setPrintProduct(p)}
                        className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition flex items-center gap-1">
                        <Printer size={11} /> Label
                      </button>
                    )}
                    <button
                      onClick={() => setToggleId(p.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${
                        p.status === "ACTIVE"
                          ? "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                          : "text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
                      }`}
                    >
                      {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No products found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetected={(barcode) => { setShowScanner(false); handleScannedBarcode(barcode); }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {phoneScanner.token && (
        <PhonePairModal
          token={phoneScanner.token}
          orgId={orgId}
          onClose={phoneScanner.disconnect}
        />
      )}

      {viewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewProduct(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Product Details</h3>
              <button onClick={() => setViewProduct(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
            </div>
            {viewProduct.image && (
              <img src={viewProduct.image} alt={viewProduct.name} className="w-full h-36 object-cover rounded-lg mb-4" />
            )}
            <dl className="space-y-2 text-sm">
              {([
                ["Name",          viewProduct.name],
                ["Category",      viewProduct.category?.name ?? "—"],
                ["Barcode",       viewProduct.barcode ?? "—"],
                ["Current Stock", viewProduct.quantity],
                ["Selling Price", `M ${Number(viewProduct.sellingPrice).toFixed(2)}`],
                ["Buying Price",  `M ${Number(viewProduct.buyingPrice).toFixed(2)}`],
              ] as [string, string | number][]).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-slate-400 shrink-0">{label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => { setViewProduct(null); openEdit(viewProduct); }}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Edit Product
            </button>
          </div>
        </div>
      )}

      {printProduct && (
        <PrintLabelModal product={printProduct} onClose={() => setPrintProduct(null)} />
      )}

      {/* Toggle status confirm modal */}
      {toggleId && (() => {
        const p = products.find((x) => x.id === toggleId)!;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {p.status === "ACTIVE" ? "Deactivate" : "Activate"} Product
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                {p.status === "ACTIVE"
                  ? `"${p.name}" will be hidden from sales but its history is preserved.`
                  : `"${p.name}" will be made available again.`}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setToggleId(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handleToggle} className={`px-4 py-2 text-sm text-white rounded-lg transition ${p.status === "ACTIVE" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                  {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const LABEL_SIZES = {
  small:  { w: 150, h: 70,  namePx: 9,  pricePx: 8,  barH: 28 },
  medium: { w: 220, h: 100, namePx: 11, pricePx: 10, barH: 38 },
  large:  { w: 300, h: 130, namePx: 13, pricePx: 11, barH: 50 },
} as const;
type LabelSize = keyof typeof LABEL_SIZES;

function barcodeStripes(barcode: string, totalW: number, barH: number) {
  const bars = barcode.split("").flatMap((ch) => {
    const n = parseInt(ch, 10);
    return [1 + (n % 3), 1 + ((n + 1) % 2)];
  });
  const total = bars.reduce((s, w) => s + w, 0);
  const scale = (totalW - 8) / total;
  let x = 4;
  return bars.map((w, i) => {
    const rect = i % 2 === 0
      ? `<rect x="${x.toFixed(1)}" y="0" width="${(w * scale).toFixed(1)}" height="${barH}" fill="#000"/>`
      : "";
    x += w * scale;
    return rect;
  }).join("");
}

function buildLabelHTML(product: Product, qty: number, size: LabelSize): string {
  const { w, h, namePx, pricePx, barH } = LABEL_SIZES[size];
  const barcode = product.barcode!;
  const stripes = barcodeStripes(barcode, w, barH);
  const label = `
    <div style="width:${w}px;height:${h}px;border:1px solid #ccc;border-radius:4px;padding:4px 4px 2px;display:inline-flex;flex-direction:column;align-items:center;justify-content:space-between;margin:4px;box-sizing:border-box;font-family:sans-serif;">
      <div style="font-size:${namePx}px;font-weight:600;text-align:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${product.name}</div>
      <svg viewBox="0 0 ${w} ${barH}" width="${w - 8}" height="${barH}" xmlns="http://www.w3.org/2000/svg">${stripes}</svg>
      <div style="font-size:${pricePx}px;letter-spacing:1px;">${barcode}</div>
      <div style="font-size:${pricePx}px;font-weight:700;">M ${Number(product.sellingPrice).toFixed(2)}</div>
    </div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Labels</title>
    <style>@page{margin:8mm} body{margin:0;display:flex;flex-wrap:wrap;}</style>
    </head><body>${Array(qty).fill(label).join("")}</body></html>`;
}

function PrintLabelModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<LabelSize>("medium");

  function handlePrint() {
    const win = window.open("", "_blank", "width=700,height=500");
    if (!win) return;
    win.document.write(buildLabelHTML(product, qty, size));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Print Barcode Label</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 truncate">{product.name} · {product.barcode}</p>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Label Size</label>
            <div className="flex gap-2">
              {(["small", "medium", "large"] as LabelSize[]).map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition ${
                    size === s
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Quantity</label>
            <input type="number" min={1} max={100} value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(100, Number(e.target.value))))}
              className={inputCls} />
          </div>
        </div>

        <button onClick={handlePrint}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition">
          <Printer size={15} /> Print {qty} Label{qty !== 1 ? "s" : ""}
        </button>
      </div>
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
    orgId = id;
    orgName = org.name;
  } else {
    orgId = session.user.organizationId!;
    orgName = session.user.organizationName ?? "";
  }

  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    props: {
      isPlatform,
      orgId,
      orgName,
      products: products.map((p) => ({
        ...p,
        buyingPrice: p.buyingPrice.toString(),
        sellingPrice: p.sellingPrice.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
  };
};
