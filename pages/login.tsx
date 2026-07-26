import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Invalid email or password"); return; }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const isPlatform = ["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(session?.user?.role ?? "");
    router.push(isPlatform ? "/platform" : "/dashboard");
  }

  const inputCls = "w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg">SmartPOS</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Multi-tenant POS<br />platform for modern<br />businesses
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Manage your entire business from one place. Sales, inventory, users, and reports — all in one dashboard.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Organizations", value: "Multi-tenant" },
              { label: "Roles", value: "3 role types" },
              { label: "Access", value: "Role-based" },
              { label: "Data", value: "Fully isolated" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-white font-semibold text-sm">{s.value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} SmartPOS. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">SmartPOS</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Demo accounts</p>
            <div className="space-y-2">
              {[
                { label: "Super Admin",       email: "admin@smartpos.com",  role: "SUPER_ADMIN",        org: "SmartPOS Platform",  color: "text-purple-600 dark:text-purple-400" },
                { label: "Support Admin",      email: "support@smartpos.com",role: "SUPPORT_ADMIN",      org: "SmartPOS Platform",  color: "text-blue-600 dark:text-blue-400" },
                { label: "Smart Mart Admin",   email: "admin@smartmart.com", role: "ORGANIZATION_ADMIN", org: "Smart Mart Demo",    color: "text-green-600 dark:text-green-400" },
                { label: "Oasis Admin",        email: "admin@oasis.com",     role: "ORGANIZATION_ADMIN", org: "Oasis Grocery",      color: "text-green-600 dark:text-green-400" },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(d.role) ? "admin123" : "demo123"); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition text-left"
                >
                  <div>
                    <p className="text-xs text-gray-700 dark:text-slate-300">{d.label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{d.org}</p>
                  </div>
                  <span className={`text-xs font-medium ${d.color}`}>{d.role.replace(/_/g, " ")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
