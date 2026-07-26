import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import Pagination from "@/components/Pagination";

type Org = { id: number; name: string; email: string | null; phone: string | null; address: string | null; status: string; createdAt: string; _count: { users: number } };
type Props = { orgs: Org[]; role: string };

const STATUSES = ["TRIAL", "ACTIVE", "SUSPENDED"];
const EMPTY = { name: "", email: "", phone: "", address: "", status: "TRIAL" };
const inputCls = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1";

const statusColor: Record<string, string> = {
  ACTIVE:    "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  TRIAL:     "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  SUSPENDED: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

export default function OrganizationsPage({ orgs: initial, role }: Props) {
  const [orgs, setOrgs] = useState(initial);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();

  const isSuperAdmin = role === "SUPER_ADMIN";

  function openAdd() { setEditId(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function openEdit(o: Org) { setEditId(o.id); setForm({ name: o.name, email: o.email ?? "", phone: o.phone ?? "", address: o.address ?? "", status: o.status }); setError(""); setShowForm(true); }
  function cancel() { setShowForm(false); setEditId(null); setForm(EMPTY); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const isEdit = editId !== null;
    const res = await fetch(isEdit ? `/api/organizations/${editId}` : "/api/organizations", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setOrgs(isEdit
      ? orgs.map((o) => o.id === editId ? { ...o, ...data, _count: o._count } : o)
      : [{ ...data, _count: { users: 0 } }, ...orgs]
    );
    cancel();
  }

  async function toggleStatus(org: Org) {
    const res = await fetch(`/api/organizations/${org.id}`, { method: "PATCH" });
    const data = await res.json();
    if (res.ok) setOrgs(orgs.map((o) => o.id === org.id ? { ...o, status: data.status } : o));
  }

  const paged = orgs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations</h2>
        {isSuperAdmin && (
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Add Organization
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{editId ? "Edit Organization" : "New Organization"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Smart Mart" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="info@business.com" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+266 5000 0000" />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Maseru, Lesotho" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
              {loading ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={cancel} className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              {["Name", "Email", "Phone", "Users", "Status", "Created", ...(isSuperAdmin ? ["Actions"] : [])].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {paged.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{o.name}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{o.email ?? "—"}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{o.phone ?? "—"}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{o._count.users}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[o.status] ?? ""}`}>{o.status}</span>
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                {isSuperAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/platform/org-users?orgId=${o.id}`)} className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition">
                        Users
                      </button>
                      <button onClick={() => openEdit(o)} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                        Edit
                      </button>
                      <button onClick={() => toggleStatus(o)} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${o.status === "SUSPENDED" ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30" : "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30"}`}>
                        {o.status === "SUSPENDED" ? "Activate" : "Suspend"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No organizations yet</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={orgs.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session || !['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(session.user.role)) return { redirect: { destination: "/login", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } } },
  });

  return {
    props: {
      role: session.user.role,
      orgs: orgs.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    },
  };
};
