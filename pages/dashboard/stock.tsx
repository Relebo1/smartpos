import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState } from "react";
import { Search, Package, AlertTriangle, PackageX } from "lucide-react";

type Product = {
  id: number; name: string; barcode: string | null; image: string | null;
  quantity: number; minimumStock: number; sellingPrice: string;
  category: { name: string } | null;
};

type Props = { products: Product[]; orgName: string };

function stockStatus(qty: number, min: number) {
  if (qty === 0) return { label: "Out of Stock", cls: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" };
  if (qty <= min) return { label: "Low Stock",   cls: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" };
  return              { label: "In Stock",       cls: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };
}

export default function StockViewPage({ products, orgName }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    const status = stockStatus(p.quantity, p.minimumStock).label;
    const matchFilter = !filter || status === filter;
    return matchSearch && matchFilter;
  });

  const inStock   = products.filter((p) => p.quantity > p.minimumStock).length;
  const lowStock  = products.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock).length;
  const outStock  = products.filter((p) => p.quantity === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stock View — {orgName}</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Read-only stock levels</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "In Stock",     value: inStock,  color: "text-green-600 dark:text-green-400",  icon: <Package size={18} /> },
          { label: "Low Stock",    value: lowStock,  color: "text-yellow-600 dark:text-yellow-400", icon: <AlertTriangle size={18} /> },
          { label: "Out of Stock", value: outStock,  color: "text-red-600 dark:text-red-400",      icon: <PackageX size={18} /> },
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or barcode…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option>In Stock</option>
          <option>Low Stock</option>
          <option>Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              {["Product", "Category", "Barcode", "Price", "Available", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map((p) => {
              const { label, cls } = stockStatus(p.quantity, p.minimumStock);
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-7 h-7 rounded object-cover shrink-0" />
                        : <div className="w-7 h-7 rounded bg-gray-100 dark:bg-slate-700 shrink-0" />}
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-slate-500">{p.barcode ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">M {Number(p.sellingPrice).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-base ${p.quantity === 0 ? "text-red-600 dark:text-red-400" : p.quantity <= p.minimumStock ? "text-yellow-600 dark:text-yellow-400" : "text-gray-900 dark:text-white"}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (!["ORGANIZATION_ADMIN", "CASHIER"].includes(session.user.role))
    return { redirect: { destination: "/login", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const orgId = session.user.organizationId!;
  const orgName = session.user.organizationName ?? "";

  const products = await prisma.product.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return {
    props: {
      orgName,
      products: products.map((p) => ({
        id: p.id, name: p.name, barcode: p.barcode, image: p.image,
        quantity: p.quantity, minimumStock: p.minimumStock,
        sellingPrice: p.sellingPrice.toString(),
        category: p.category,
      })),
    },
  };
};
