import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { useState, FormEvent } from "react";
import Pagination from "@/components/Pagination";

type User = { id: number; name: string; email: string; role: string; createdAt: string };
type Props = { users: User[]; orgId: number; orgName: string };

const EMPTY = { name: "", email: "", password: "" };
const inputCls = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1";

export default function PlatformOrgUsersPage({ users: initial, orgId, orgName }: Props) {
  const [users, setUsers] = useState(initial);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function openAdd() { setEditId(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function openEdit(u: User) { setEditId(u.id); setForm({ name: u.name, email: u.email, password: "" }); setError(""); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditId(null); setForm(EMPTY); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const isEdit = editId !== null;
    const res = await fetch(
      isEdit ? `/api/users/${editId}` : `/api/users?organizationId=${orgId}`,
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setUsers(isEdit ? users.map((u) => (u.id === editId ? data : u)) : [data, ...users]);
    cancelForm();
  }

  async function handleDeactivate() {
    if (!deactivateId) return;
    await fetch(`/api/users/${deactivateId}`, { method: "PATCH" });
    setUsers(users.filter((u) => u.id !== deactivateId));
    setDeactivateId(null);
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users — {orgName}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Organization admins for this organization</p>
        </div>
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

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              {["Name", "Email", "Role", "Created", "Actions"].map((h) => (
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
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                      Edit
                    </button>
                    <button onClick={() => setDeactivateId(u.id)} className="px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition">
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No users in this organization yet</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={users.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

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
  if (!session || !["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(session.user.role))
    return { redirect: { destination: "/platform", permanent: false } };

  const orgId = Number(context.query.orgId);
  if (!orgId) return { redirect: { destination: "/platform/organizations", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { redirect: { destination: "/platform/organizations", permanent: false } };

  const users = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    props: {
      orgId,
      orgName: org.name,
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    },
  };
};
