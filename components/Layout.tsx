import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { ReactNode, useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, Package, Warehouse, ShoppingCart,
  BarChart2, LogOut, Building2, ShieldCheck, HeadphonesIcon,
  ChevronDown, ChevronRight, ArrowLeft, ScanBarcode, History, Eye, Menu, X, MoreHorizontal,
} from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

type NavItem = { label: string; href: string; roles: string[]; icon: ReactNode };
type OrgOption = { id: number; name: string; status: string };

const PLATFORM_ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN"];

const PLATFORM_NAV: NavItem[] = [
  { label: "Dashboard",     href: "/platform",               roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"], icon: <LayoutDashboard size={16} /> },
  { label: "Organizations", href: "/platform/organizations", roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"], icon: <Building2 size={16} /> },
  { label: "Users",         href: "/platform/users",         roles: ["SUPER_ADMIN"],                  icon: <ShieldCheck size={16} /> },
  { label: "Products",      href: "/dashboard/products",     roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"], icon: <Package size={16} /> },
  { label: "Inventory",     href: "/dashboard/inventory",    roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"], icon: <Warehouse size={16} /> },
  { label: "Support",       href: "/platform/support",       roles: ["SUPER_ADMIN", "SUPPORT_ADMIN"], icon: <HeadphonesIcon size={16} /> },
  { label: "Reports",       href: "/platform/reports",       roles: ["SUPER_ADMIN"],                  icon: <BarChart2 size={16} /> },
];

const ORG_NAV: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",               roles: ["ORGANIZATION_ADMIN", "CASHIER"],           icon: <LayoutDashboard size={16} /> },
  { label: "Users",         href: "/dashboard/users",         roles: ["ORGANIZATION_ADMIN"],                      icon: <Users size={16} /> },
  { label: "Products",      href: "/dashboard/products",      roles: ["ORGANIZATION_ADMIN"],                      icon: <Package size={16} /> },
  { label: "Inventory",     href: "/dashboard/inventory",     roles: ["ORGANIZATION_ADMIN"],                      icon: <Warehouse size={16} /> },
  { label: "Stock View",    href: "/dashboard/stock",         roles: ["CASHIER"],                                 icon: <Eye size={16} /> },
  { label: "Sales",         href: "/dashboard/sales",         roles: ["ORGANIZATION_ADMIN"],                      icon: <ShoppingCart size={16} /> },
  { label: "Sales History", href: "/dashboard/sales/history", roles: ["ORGANIZATION_ADMIN", "CASHIER"],           icon: <History size={16} /> },
  { label: "POS",           href: "/dashboard/sales/pos",     roles: ["ORGANIZATION_ADMIN", "CASHIER"],           icon: <ScanBarcode size={16} /> },
  { label: "Reports",       href: "/dashboard/reports",       roles: ["ORGANIZATION_ADMIN"],                      icon: <BarChart2 size={16} /> },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:        "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  SUPPORT_ADMIN:      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  ORGANIZATION_ADMIN: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  CASHIER:            "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
};

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/70"
      }`}
    >
      <span className={active ? "text-white" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors"}>
        {item.icon}
      </span>
      {item.label}
      {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role      = session?.user?.role ?? "";
  const orgName   = session?.user?.organizationName ?? "";
  const isPlatform = PLATFORM_ROLES.includes(role);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Close sidebar/more on route change
  useEffect(() => { setSidebarOpen(false); setMoreMenuOpen(false); }, [router.pathname]);

  // Org selector for platform users
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlatform) return;
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data: OrgOption[]) => {
        setOrgs(data);
        const qOrgId = Number(router.query.orgId) || Number(router.query.organizationId);
        const match = qOrgId ? data.find((o: OrgOption) => o.id === qOrgId) : null;
        // On /platform/users with no query param, default to first org
        setSelectedOrg(match ?? (["/platform/users", "/dashboard/products", "/dashboard/inventory"].includes(router.pathname) ? data[0] ?? null : null));
      });
  }, [isPlatform, router.query.orgId, router.query.organizationId, router.pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const navItems = isPlatform ? PLATFORM_NAV : ORG_NAV;
  const visibleNav = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    // ORGANIZATION_ADMIN always sees everything
    if (role === "ORGANIZATION_ADMIN") return true;
    // If no permissions set, show all allowed items
    const perms: string[] = session?.user?.permissions ?? [];
    if (perms.length === 0) return true;
    // Map href to permission key
    const keyMap: Record<string, string> = {
      "/dashboard":               "dashboard",
      "/dashboard/users":         "users",
      "/dashboard/products":      "products",
      "/dashboard/inventory":     "inventory",
      "/dashboard/stock":         "stock_view",
      "/dashboard/sales":         "sales",
      "/dashboard/sales/history": "sales_history",
      "/dashboard/sales/pos":     "pos",
      "/dashboard/reports":       "reports",
    };
    const key = keyMap[item.href];
    return !key || perms.includes(key);
  });

  const isUsersPage = router.pathname === "/platform/users";
  const isProductsPage = router.pathname === "/dashboard/products";
  const isInventoryPage = router.pathname === "/dashboard/inventory";
  const isOrgContext = router.pathname.startsWith("/platform/org-users") || isUsersPage;

  const currentLabel =
    [...PLATFORM_NAV, ...ORG_NAV]
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((n) => router.pathname.startsWith(n.href))?.label
    ?? (isOrgContext ? "Org Users" : "Dashboard");

  function isActive(item: NavItem) {
    if (item.href === "/dashboard" || item.href === "/platform")
      return router.pathname === item.href;
    return router.pathname.startsWith(item.href);
  }

  const sidebarContent = (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col h-full">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">SmartPOS</h1>
              <p className="text-xs mt-0.5 truncate">
                {isPlatform
                  ? <span className="text-blue-500 font-medium">Platform Admin</span>
                  : <span className="text-gray-400 dark:text-slate-500">{orgName}</span>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {status === "loading" ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse mb-1" />
            ))
          ) : (
            <>
              <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                {isPlatform ? "Platform" : "Organization"}
              </p>
              {visibleNav.map((item) => (
                <NavButton
                  key={item.href}
                  item={item}
                  active={isActive(item)}
                  onClick={() => {
                    if (router.pathname === item.href) return;
                    // For platform users navigating to products, carry the org context
                    if (isPlatform && item.href === "/dashboard/products" && selectedOrg) {
                      router.push(`/dashboard/products?organizationId=${selectedOrg.id}`);
                    } else if (isPlatform && item.href === "/dashboard/inventory" && selectedOrg) {
                      router.push(`/dashboard/inventory?organizationId=${selectedOrg.id}`);
                    } else {
                      router.push(item.href);
                    }
                  }}
                />
              ))}
            </>
          )}
        </nav>

        {/* Bottom: Org selector + Profile */}
        <div className="border-t border-gray-100 dark:border-slate-700">

          {/* Org selector — platform users only */}
          {isPlatform && (
            <div className="px-3 py-3 border-b border-gray-100 dark:border-slate-700" ref={dropdownRef}>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Manage Organization
              </p>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate text-xs">{selectedOrg ? selectedOrg.name : "Select organization"}</span>
                </div>
                <ChevronDown size={13} className={`shrink-0 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="mt-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden z-50 relative">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-400 dark:text-slate-500">Select to manage users</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {orgs.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-gray-400 dark:text-slate-500">No organizations found</p>
                    ) : (
                      orgs.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setSelectedOrg(o);
                            setDropdownOpen(false);
                            if (isUsersPage) {
                              router.push(`/platform/users?organizationId=${o.id}`);
                            } else if (isProductsPage) {
                              router.push(`/dashboard/products?organizationId=${o.id}`);
                            } else if (isInventoryPage) {
                              router.push(`/dashboard/inventory?organizationId=${o.id}`);
                            } else {
                              router.push(`/platform/org-users?orgId=${o.id}`);
                            }
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm transition flex items-center justify-between gap-2 ${
                            selectedOrg?.id === o.id
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span className="truncate text-xs font-medium">{o.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                            o.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                            o.status === "TRIAL"  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}>{o.status}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate leading-none mb-0.5">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{session?.user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600"}`}>
                {role.replace(/_/g, " ")}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition"
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        </div>
    </aside>
  );

  const mobileLimit = visibleNav.length <= 5 ? visibleNav.length : 4;
  const mobileNavLinks = visibleNav.slice(0, mobileLimit);
  const mobileMoreLinks = visibleNav.slice(mobileLimit);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Mobile sidebar overlay ───────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 h-full">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0">
        {sidebarContent}
      </div>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 mr-auto min-w-0">
            {isOrgContext && (
              <button
                onClick={() => router.push("/platform/organizations")}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{currentLabel}</h2>
              {isOrgContext && selectedOrg && (
                <p className="text-xs text-blue-500 dark:text-blue-400 truncate">{selectedOrg.name}</p>
              )}
              {!isPlatform && orgName && (
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{orgName}</p>
              )}
            </div>
          </div>
          <GlobalSearch />
          <NotificationBell />
          <ThemeToggle />
        </header>

        {/* Org context banner */}
        {isOrgContext && selectedOrg && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 px-6 py-2 flex items-center gap-3">
            <Building2 size={14} className="text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Managing <span className="font-semibold">{selectedOrg.name}</span> — users created here belong strictly to this organization
            </p>
            <button
              onClick={() => { setSelectedOrg(null); router.push("/platform/organizations"); }}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition"
            >
              Exit context
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 flex flex-col overflow-auto pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Mobile More drawer */}
      {moreMenuOpen && (
        <div className="lg:hidden fixed bottom-16 left-2 right-2 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm">More</p>
            <button onClick={() => setMoreMenuOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X size={15} /></button>
          </div>
          <div className="p-2 grid grid-cols-3 gap-1">
            {mobileMoreLinks.map((item) => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all ${
                  isActive(item) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}>
                <span>{item.icon}</span>
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile bottom tab nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex items-center justify-around px-0.5 py-1">
        {mobileNavLinks.map((item) => (
          <button key={item.href} onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-all flex-1 min-w-0 ${
              isActive(item) ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
            }`}>
            <span>{item.icon}</span>
            <span className="text-[8px] font-medium text-center leading-tight w-full truncate px-0.5">{item.label}</span>
          </button>
        ))}
        {mobileMoreLinks.length > 0 && (
          <button onClick={() => setMoreMenuOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-all flex-1 min-w-0 ${
              moreMenuOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
            }`}>
            <MoreHorizontal size={18} />
            <span className="text-[8px] font-medium">More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
