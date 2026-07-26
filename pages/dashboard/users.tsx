import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState, FormEvent } from "react";
import Pagination from "@/components/Pagination";
import { ShieldCheck } from "lucide-react";

type User = { id: number; name: string; email: string; role: string; permissions: string[]; createdAt: string };
type Props = { users: User[]; organizationId: number };

const EMPTY = { name: "", email: "", password: "", role: "CASHIER" };

const inputCls = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1";

// Menu items available per role
const CASHIER_MENUS = [
  { key: "dashboard",     label: "Dashboard" },
  { key: "pos",           label: "POS" },
  { key: "sales_history", label: "Sales History" },
  { key: "stock_view",    label: "Stock View" },
];

const ADMIN_MENUS = [
  { key: "dashboard",  label: "Dashboard" },
  { key: "users",      label: "Users" },
  { key: "products",   label: "Products" },
  { key: "inventory",  label: "Inventory" },
  { key: "sales",      label: "Sales" },
  { key: "sales_history", label: "Sales History" },
  { key: "pos",        label: "POS" },
  { key: "reports",    label: "Reports" },
];

export default function UsersPage({ users: initial }: Props) {
  const [users, setUsers] = useState(initial);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Permissions modal
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permSelected, setPermSelected] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);

  function openAdd() { setEditId(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function openEdit(u: User) { setEditId(u.id); setForm({ name: u.name, email: u.email, password: "", role: u.role }); setError(""); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditId(null); setForm(EMPTY); setError(""); }

  function openPermissions(u: User) {
    setPermUser(u);
    setPermSelected(u.permissions ?? []);
  }

  function togglePerm(key: string) {
    setPermSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function savePermissions() {
    if (!permUser) return;
    setPermLoading(true);
    const res = await fetch(`/api/users/${permUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: permSelected }),
    });
    setPermLoading(false);
    if (res.ok) {
      setUsers(users.map((u) => u.id === permUser.id ? { ...u, permissions: permSelected } : u));
      setPermUser(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const isEdit = editId !== null;
    const res = await fetch(isEdit ? `/api/users/${editId}` : "/api/users", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({ error: "Unable to save the user. Please try again." }));
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setUsers(isEdit ? users.map((u) => (u.id === editId ? data : u)) : [data, ...users]);
    cancelForm();
  }

  async function handleDeactivate() {
    if (!deactivateId) return;
    await fetch(`/api/users/${deactivateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUsers(users.filter((u) => u.id !== deactivateId));
    setDeactivateId(null);
  }

  const menuOptions = permUser?.role === "CASHIER" ? CASHIER_MENUS : ADMIN_MENUS;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{editId ? "Edit User" : "New User"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="john@example.com" />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                <option value="CASHIER">Cashier</option>
                <option value="ORGANIZATION_ADMIN">Organization Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Password{" "}
                {editId && <span className="text-gray-400 dark:text-slate-500 font-normal">(leave blank to keep current)</span>}
              </label>
              <input type="password" required={!editId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
              {loading ? "Saving..." : editId ? "Update User" : "Create User"}
            </button>
            <button type="button" onClick={cancelForm} className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden w-full">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              {["Name", "Email", "Role", "Permissions", "Created", "Actions"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {users.slice((page - 1) * pageSize, page * pageSize).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.name}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                    {u.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.permissions?.length > 0 ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">{u.permissions.length} menu(s)</span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500">All access</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                      Edit
                    </button>
                    <button onClick={() => openPermissions(u)} className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition flex items-center gap-1">
                      <ShieldCheck size={11} /> Permissions
                    </button>
                    <button onClick={() => setDeactivateId(u.id)} className="px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition">
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No users yet</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={users.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* Permissions Modal */}
      {permUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-purple-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Permissions</h3>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
              {permUser.name} — {permUser.role.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Select which menus this user can access. Leave all unchecked to grant full access.</p>
            <div className="space-y-2 mb-6">
              {menuOptions.map((m) => (
                <label key={m.key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={permSelected.includes(m.key)}
                    onChange={() => togglePerm(m.key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{m.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPermUser(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                Cancel
              </button>
              <button onClick={savePermissions} disabled={permLoading} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition">
                {permLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {deactivateId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Deactivate User</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This user will be deactivated and won't be able to log in.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeactivateId(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                Cancel
              </button>
              <button onClick={handleDeactivate} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session || session.user.role !== "ORGANIZATION_ADMIN")
    return { redirect: { destination: "/login", permanent: false } };

  const orgId = session.user.organizationId!;
  const { prisma } = await import("@/lib/prisma");
  const users = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    props: {
      organizationId: orgId,
      users: users.map((u) => ({
        ...u,
        permissions: (u.permissions as string[]) ?? [],
        createdAt: u.createdAt.toISOString(),
      })),
    },
  };
};
