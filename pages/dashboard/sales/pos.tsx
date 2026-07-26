import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../../api/auth/[...nextauth]";
import { useEffect, useRef, useState, useCallback } from "react";
import { Search, ScanBarcode, X, Plus, Minus, ShoppingCart, Trash2, UserCircle, ChevronDown, CheckCircle, Banknote, CreditCard, Smartphone, Building2, Printer, Link2 } from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });
const PhonePairModal = dynamic(() => import("@/components/PhonePairModal"), { ssr: false });

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  sellingPrice: string;
  quantity: number;
  image: string | null;
  category: { name: string } | null;
};

type CartItem = Product & { qty: number; itemDiscount: number };

type Customer = { id: number; name: string; phone: string | null; isWalkIn: boolean };

type Props = { orgId: number; orgName: string; orgAddress: string | null; orgPhone: string | null };

export default function POSPage({ orgId, orgName, orgAddress, orgPhone }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const isMobile = typeof window !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  async function openScanner() {
    if (isMobile) {
      const res = await fetch("/api/scanner/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const { token: t } = await res.json();
      setPhoneToken(t);
    } else {
      setShowScanner(true);
    }
  }
  const searchRef = useRef<HTMLInputElement>(null);

  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSound = useCallback((src: string) => {
    new Audio(src).play().catch(() => {});
  }, []);

  const fetchProducts = useCallback(
    async (query: string, isBarcode = false) => {
      if (!query.trim()) { setResults([]); return; }
      setSearching(true);
      const param = isBarcode ? `barcode=${encodeURIComponent(query)}` : `search=${encodeURIComponent(query)}`;
      const res = await fetch(`/api/products?organizationId=${orgId}&${param}`);
      const data: Product[] = await res.json();
      setSearching(false);
      if (isBarcode && data.length === 1) {
        playSound("/sounds/scanned.mp3");
        addToCart(data[0]);
        setSearch("");
        setResults([]);
      } else {
        if (isBarcode) playSound("/sounds/error.mp3");
        setResults(data);
      }
    },
    [orgId, playSound]
  );

  // Poll for barcodes pushed from a paired phone scanner
  useEffect(() => {
    if (!phoneToken) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/scanner/poll?token=${phoneToken}`);
      if (res.status === 404) { setPhoneToken(null); return; } // session expired
      const { barcode } = await res.json();
      if (barcode) fetchProducts(barcode, true);
    }, 800);
    return () => clearInterval(interval);
  }, [phoneToken, fetchProducts]);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const t = setTimeout(() => fetchProducts(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  // Global keydown for barcode scanner (keyboard wedge)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter") {
        if (barcodeBuffer.current.length >= 4) fetchProducts(barcodeBuffer.current, true);
        barcodeBuffer.current = "";
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fetchProducts]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1, itemDiscount: 0 }];
    });
  }

  function updateQty(id: number, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  const subtotal = cart.reduce((sum, i) => sum + Number(i.sellingPrice) * i.qty - i.itemDiscount, 0);
  const taxAmt = (subtotal - discount) * (taxRate / 100);
  const grandTotal = subtotal - discount + taxAmt;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* Left: Search + Results */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">POS — {orgName}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Search or scan to add products</p>
          </div>
          <div className="flex items-center gap-2">
            {phoneToken && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Phone connected
              </span>
            )}
            <button
              onClick={openScanner}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
            >
              <ScanBarcode size={14} />
              Scan Barcode
            </button>
            {!isMobile && (
              <button
                onClick={async () => {
                  const res = await fetch("/api/scanner/pair", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ organizationId: orgId }),
                  });
                  const { token } = await res.json();
                  setPhoneToken(token);
                }}
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
              >
                <Link2 size={14} />
                Connect Phone
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) fetchProducts(search, true); }}
            placeholder="Search by name, barcode, or description…"
            autoFocus
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => { setSearch(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searching && <div className="text-center py-8 text-sm text-gray-400 dark:text-slate-500">Searching…</div>}
          {!searching && search && results.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400 dark:text-slate-500">No products found for "{search}"</div>
          )}
          {!searching && !search && (
            <div className="text-center py-16 text-gray-300 dark:text-slate-600">
              <Search size={40} className="mx-auto mb-3" />
              <p className="text-sm">Search for a product or scan a barcode</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.quantity === 0}
                className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 text-left hover:ring-2 hover:ring-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {p.image
                  ? <img src={p.image} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                  : <div className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-lg mb-2 flex items-center justify-center text-gray-300 dark:text-slate-600"><ShoppingCart size={24} /></div>
                }
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                {p.barcode && <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{p.barcode}</p>}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">M {Number(p.sellingPrice).toFixed(2)}</span>
                  <span className={`text-xs ${p.quantity <= 5 ? "text-red-500" : "text-gray-400 dark:text-slate-500"}`}>
                    {p.quantity === 0 ? "Out of stock" : `${p.quantity} left`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-slate-800 rounded-xl shadow flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cart</h3>
          <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Customer selector */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
          <button
            onClick={() => setShowCustomerModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition text-left"
          >
            <UserCircle size={14} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-xs truncate text-gray-600 dark:text-slate-300">
              {customer ? customer.name : "Walk-in Customer"}
            </span>
            {customer && !customer.isWalkIn && (
              <button
                onClick={(e) => { e.stopPropagation(); setCustomer(null); }}
                className="text-gray-300 hover:text-red-400 transition"
              >
                <X size={12} />
              </button>
            )}
            {!customer && <ChevronDown size={12} className="text-gray-400 shrink-0" />}
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">Cart is empty</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">M {Number(item.sellingPrice).toFixed(2)} each</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition shrink-0 mt-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                      <Minus size={11} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-white">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} disabled={item.qty >= item.quantity} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition disabled:opacity-40">
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    M {(Number(item.sellingPrice) * item.qty - item.itemDiscount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals + controls */}
        {showCustomerModal && (
          <CustomerModal
            orgId={orgId}
            onSelect={(c) => { setCustomer(c); setShowCustomerModal(false); }}
            onClose={() => setShowCustomerModal(false)}
          />
        )}
        {showPaymentModal && (
          <PaymentModal
            cart={cart}
            discount={discount}
            taxAmt={taxAmt}
            grandTotal={grandTotal}
            customerId={customer?.isWalkIn ? null : customer?.id ?? null}
            orgId={orgId}
            onSuccess={(sale) => {
              setCompletedSale(sale);
              setShowPaymentModal(false);
              setCart([]);
              setDiscount(0);
              setTaxRate(0);
              setCustomer(null);
            }}
            onClose={() => setShowPaymentModal(false)}
          />
        )}
        {completedSale && (
          <ReceiptModal sale={completedSale} orgName={orgName} orgAddress={orgAddress} orgPhone={orgPhone} onClose={() => setCompletedSale(null)} />
        )}
        {showScanner && (
          <BarcodeScanner
            onDetected={(barcode) => { setShowScanner(false); fetchProducts(barcode, true); }}
            onClose={() => setShowScanner(false)}
          />
        )}
        {phoneToken && (
          <PhonePairModal
            token={phoneToken}
            orgId={orgId}
            onClose={() => setPhoneToken(null)}
          />
        )}

      {cart.length > 0 && (
          <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-4 space-y-2">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-slate-400 w-20 shrink-0">Discount (M)</label>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="0.00"
                className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Tax */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-slate-400 w-20 shrink-0">Tax (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={taxRate || ""}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                placeholder="0"
                className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>M {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>− M {discount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>Tax ({taxRate}%)</span>
                  <span>+ M {taxAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-slate-700">
                <span>Grand Total</span>
                <span>M {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition" onClick={() => setShowPaymentModal(true)}>
              Proceed to Payment
            </button>
            <button onClick={() => setCart([])} className="w-full text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 transition">
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerModal({ orgId, onSelect, onClose }: {
  orgId: number;
  onSelect: (c: Customer | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    fetch(`/api/customers?organizationId=${orgId}${q}`)
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [search, orgId]);

  async function createAndSelect() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim() || null }),
    });
    const c = await res.json();
    setCreating(false);
    if (c.id) onSelect(c);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Select Customer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 px-2">
          {loading ? (
            <p className="text-center py-6 text-xs text-gray-400">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="text-center py-6 text-xs text-gray-400">No customers found</p>
          ) : (
            customers.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.isWalkIn ? null : c)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-3"
              >
                <UserCircle size={16} className="text-gray-300 dark:text-slate-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {c.name} {c.isWalkIn && <span className="text-xs text-gray-400 font-normal">(Walk-in)</span>}
                  </p>
                  {c.phone && <p className="text-xs text-gray-400 dark:text-slate-500">{c.phone}</p>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline text-center"
            >
              + Create new customer
            </button>
          ) : (
            <div className="space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name *"
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 text-xs py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button
                  onClick={createAndSelect}
                  disabled={!newName.trim() || creating}
                  className="flex-1 text-xs py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50"
                >
                  {creating ? "Saving…" : "Save & Select"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  cart, discount, taxAmt, grandTotal, customerId, orgId, onSuccess, onClose,
}: {
  cart: CartItem[]; discount: number; taxAmt: number; grandTotal: number;
  customerId: number | null; orgId: number;
  onSuccess: (sale: any) => void; onClose: () => void;
}) {
  const METHODS = [
    { value: "CASH", label: "Cash", icon: Banknote },
    { value: "CARD", label: "Card", icon: CreditCard },
    { value: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone },
    { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  ] as const;

  const [method, setMethod] = useState<string>("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const paid = Number(amountPaid) || grandTotal;
  const change = method === "CASH" ? paid - grandTotal : 0;
  const needsRef = method !== "CASH";

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        organizationId: orgId,
        discount,
        tax: taxAmt,
        paymentMethod: method,
        amountPaid: paid,
        paymentReference: reference || null,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.qty,
          discount: i.itemDiscount,
        })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Payment failed"); return; }
    onSuccess(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Amount due */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">Amount Due</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">M {grandTotal.toFixed(2)}</p>
          </div>

          {/* Method selector */}
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                  method === value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {/* Cash: amount paid + change */}
          {method === "CASH" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 w-24 shrink-0">Amount Paid</label>
                <input
                  autoFocus
                  type="number"
                  min={grandTotal}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={grandTotal.toFixed(2)}
                  className="flex-1 text-sm px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {change > 0 && (
                <div className="flex justify-between text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                  <span>Change</span><span>M {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Reference for non-cash */}
          {needsRef && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-slate-400 w-24 shrink-0">Reference</label>
              <input
                autoFocus
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction / approval no."
                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || (method === "CASH" && Number(amountPaid) > 0 && Number(amountPaid) < grandTotal)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition"
          >
            {submitting ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ sale, orgName, orgAddress, orgPhone, onClose }: {
  sale: any; orgName: string; orgAddress: string | null; orgPhone: string | null; onClose: () => void;
}) {
  const payment = sale.payments?.[0];
  const amountPaid = Number(payment?.amount ?? sale.total);
  const change = payment?.method === "CASH" ? amountPaid - Number(sale.total) : 0;
  const date = new Date(sale.createdAt);
  const dateStr = date.toLocaleDateString("en-GB").replace(/\//g, "/");
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const receiptHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${sale.receiptNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
    }
    .receipt { width: 80mm; padding: 8mm 6mm 12mm; }
    .center { text-align: center; }
    .stars { letter-spacing: 4px; font-size: 11px; color: #333; }
    .store-name { font-size: 20px; font-weight: 700; margin: 4px 0 2px; }
    .store-sub { font-size: 11px; color: #444; margin-bottom: 2px; }
    .eq { letter-spacing: 1px; color: #000; margin: 8px 0; font-size: 11px; }
    .meta-row { display: flex; justify-content: center; margin-bottom: 3px; }
    .meta-label { width: 72px; text-align: right; padding-right: 6px; }
    .meta-value { width: 100px; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .dash { border-top: 1px dashed #000; margin: 8px 0; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin-bottom: 2px; }
    .tax-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
    .payment-block { margin-top: 6px; font-size: 12px; }
    .content { width: 176px; margin: 0 auto; }
    .thankyou { text-align: center; font-weight: 700; font-size: 14px; margin: 10px 0 6px; letter-spacing: 1px; }
    .barcode { text-align: center; margin-top: 6px; }
    .barcode svg { display: block; margin: 0 auto; width: 160px; height: 40px; }
  </style>
</head>
<body>
<div class="receipt">
  <div class="center">
    <div class="stars">*****</div>
    <div class="store-name">${orgName}</div>
    ${orgAddress ? `<div class="store-sub">${orgAddress}</div>` : ""}
    ${orgPhone ? `<div class="store-sub">${orgPhone}</div>` : ""}
    <div class="stars" style="margin-top:4px">*****</div>
  </div>

  <div style="margin: 8px 0 4px">
    <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">${dateStr}</span></div>
    <div class="meta-row"><span class="meta-label">Cashier:</span><span class="meta-value">${sale.cashier?.name ?? ""}</span></div>
    ${sale.customer?.name ? `<div class="meta-row"><span class="meta-label">Customer:</span><span class="meta-value">${sale.customer.name}</span></div>` : ""}
  </div>

  <div class="eq">${"=".repeat(38)}</div>

  <div class="content">
  ${(sale.items ?? []).map((item: any) => `
    <div class="item-row">
      <span># ${item.name} x${item.quantity}</span>
      <span>${Number(item.lineTotal).toFixed(2)}</span>
    </div>
    ${Number(item.discount) > 0 ? `<div class="item-row" style="font-size:11px;color:#555"><span>&nbsp;&nbsp;Discount</span><span>-${Number(item.discount).toFixed(2)}</span></div>` : ""}
  `).join("")}

  <div class="dash"></div>

  <div class="total-row"><span>Total</span><span>${Number(sale.total).toFixed(2)}</span></div>
  ${Number(sale.discount) > 0 ? `<div class="tax-row"><span>Discount</span><span>-${Number(sale.discount).toFixed(2)}</span></div>` : ""}
  <div class="tax-row"><span>Tax</span><span>${Number(sale.tax ?? 0).toFixed(2)}</span></div>

  <div class="dash"></div>

  <div class="payment-block">
    <div class="payment-row">
      <span>${(payment?.method ?? "").replace(/_/g, " ")}:</span>
      <span>${amountPaid.toFixed(2)}</span>
    </div>
    ${change > 0 ? `<div class="payment-row"><span>Change:</span><span>${change.toFixed(2)}</span></div>` : ""}
    ${payment?.reference ? `<div style="margin-top:3px">#Transaction &nbsp; ${payment.reference}</div>` : ""}
    <div style="margin-top:3px">${dateStr} &nbsp; ${timeStr}</div>
    <div style="margin-top:3px">#Receipt &nbsp; ${sale.receiptNumber}</div>
  </div>
  </div>

  <div class="thankyou">THANK YOU!</div>

  <div class="barcode">
    <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      ${Array.from({ length: 60 }, (_, i) => {
        const x = 5 + i * 3.2;
        const w = (i % 3 === 0) ? 2 : (i % 5 === 0) ? 1.5 : 1;
        const h = (i % 7 === 0) ? 50 : 42;
        return `<rect x="${x.toFixed(1)}" y="0" width="${w}" height="${h}" fill="#000"/>`;
      }).join("")}
    </svg>
    <div style="font-size:9px;letter-spacing:2px;margin-top:2px">${sale.receiptNumber}</div>
  </div>
</div>
</body>
</html>`;

  function handlePrint() {
    const win = window.open("", "_blank", "width=420,height=750");
    if (!win) return;
    win.document.write(receiptHTML);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  // ── Preview (modal) ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Payment Successful</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
        </div>

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-100 dark:bg-slate-900">
          <div
            className="bg-white mx-auto shadow-lg"
            style={{
              maxWidth: 300,
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 12,
              color: "#000",
              /* torn-edge top & bottom */
              clipPath: "polygon(0 8px,8px 0,16px 8px,24px 0,32px 8px,40px 0,48px 8px,56px 0,64px 8px,72px 0,80px 8px,88px 0,96px 8px,104px 0,112px 8px,120px 0,128px 8px,136px 0,144px 8px,152px 0,160px 8px,168px 0,176px 8px,184px 0,192px 8px,200px 0,208px 8px,216px 0,224px 8px,232px 0,240px 8px,248px 0,256px 8px,264px 0,272px 8px,280px 0,288px 8px,296px 0,300px 4px,300px calc(100% - 4px),296px 100%,288px calc(100% - 8px),280px 100%,272px calc(100% - 8px),264px 100%,256px calc(100% - 8px),248px 100%,240px calc(100% - 8px),232px 100%,224px calc(100% - 8px),216px 100%,208px calc(100% - 8px),200px 100%,192px calc(100% - 8px),184px 100%,176px calc(100% - 8px),168px 100%,160px calc(100% - 8px),152px 100%,144px calc(100% - 8px),136px 100%,128px calc(100% - 8px),120px 100%,112px calc(100% - 8px),104px 100%,96px calc(100% - 8px),88px 100%,80px calc(100% - 8px),72px 100%,64px calc(100% - 8px),56px 100%,48px calc(100% - 8px),40px 100%,32px calc(100% - 8px),24px 100%,16px calc(100% - 8px),8px 100%,0 calc(100% - 4px))",
            }}
          >
            <div style={{ padding: "20px 16px 24px" }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ letterSpacing: 4, fontSize: 11 }}>*****</div>
                <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 2px" }}>{orgName}</div>
                {orgAddress && <div style={{ fontSize: 11, color: "#555" }}>{orgAddress}</div>}
                {orgPhone && <div style={{ fontSize: 11, color: "#555" }}>{orgPhone}</div>}
                <div style={{ letterSpacing: 4, fontSize: 11, marginTop: 4 }}>*****</div>
              </div>

              {/* Meta */}
              <div style={{ marginBottom: 4 }}>
                {[{l:"Date:", v: dateStr}, {l:"Cashier:", v: sale.cashier?.name ?? ""}, ...(sale.customer?.name ? [{l:"Customer:", v: sale.customer.name}] : [])]
                  .map(({l, v}) => (
                    <div key={l} style={{ display:"flex", marginBottom: 2 }}>
                      <span style={{ width: 72 }}>{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
              </div>

              {/* === divider */}
              <div style={{ letterSpacing: 1, fontSize: 11, margin: "6px 0" }}>{'='.repeat(34)}</div>

              {/* Items */}
              {sale.items?.map((item: any) => (
                <div key={item.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 2 }}>
                    <span># {item.name} x{item.quantity}</span>
                    <span>{Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                  {Number(item.discount) > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize: 11, color:"#666", marginBottom: 2 }}>
                      <span>&nbsp;&nbsp;Discount</span><span>-{Number(item.discount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Dashed separator */}
              <div style={{ borderTop:"1px dashed #000", margin:"8px 0" }} />

              {/* Total */}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:14, marginBottom: 2 }}>
                <span>Total</span><span>{Number(sale.total).toFixed(2)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 2 }}>
                  <span>Discount</span><span>-{Number(sale.discount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 2 }}>
                <span>Tax</span><span>{Number(sale.tax ?? 0).toFixed(2)}</span>
              </div>

              {/* Dashed separator */}
              <div style={{ borderTop:"1px dashed #000", margin:"8px 0" }} />

              {/* Payment */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 2 }}>
                  <span>{(payment?.method ?? "").replace(/_/g, " ")}:</span>
                  <span>{amountPaid.toFixed(2)}</span>
                </div>
                {change > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 2 }}>
                    <span>Change:</span><span>{change.toFixed(2)}</span>
                  </div>
                )}
                {payment?.reference && <div style={{ marginTop: 2 }}>#Transaction &nbsp; {payment.reference}</div>}
                <div style={{ marginTop: 2 }}>{dateStr} &nbsp; {timeStr}</div>
                <div style={{ marginTop: 2 }}>#Receipt &nbsp; {sale.receiptNumber}</div>
              </div>

              {/* Thank you */}
              <div style={{ textAlign:"center", fontWeight:700, fontSize:14, letterSpacing:1, margin:"10px 0 8px" }}>THANK YOU!</div>

              {/* Barcode (SVG) */}
              <div style={{ textAlign:"center" }}>
                <svg viewBox="0 0 200 44" width={180} height={44} xmlns="http://www.w3.org/2000/svg" style={{ display:"block", margin:"0 auto" }}>
                  {Array.from({ length: 60 }, (_, i) => {
                    const x = 4 + i * 3.2;
                    const w = i % 3 === 0 ? 2 : i % 5 === 0 ? 1.5 : 1;
                    const h = i % 7 === 0 ? 44 : 36;
                    return <rect key={i} x={x} y={0} width={w} height={h} fill="#000" />;
                  })}
                </svg>
                <div style={{ fontSize: 9, letterSpacing: 2, marginTop: 2 }}>{sale.receiptNumber}</div>
              </div>

            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          <button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
            New Sale
          </button>
        </div>

      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const isPlatform = PLATFORM_ROLES.includes(session.user.role);
  const isOrgUser = (session.user.role as string) === "ORGANIZATION_ADMIN" || (session.user.role as string) === "CASHIER";

  if (!isPlatform && !isOrgUser) return { redirect: { destination: "/login", permanent: false } };

  let orgId: number = 0;
  let orgName: string = "";

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
  } else if (isOrgUser) {
    orgId = session.user.organizationId!;
    orgName = session.user.organizationName ?? "";
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { address: true, phone: true } });

  return { props: { orgId, orgName, orgAddress: org?.address ?? null, orgPhone: org?.phone ?? null } };
};
