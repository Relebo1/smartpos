import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

type Result = { label: string; sub: string; href: string };

const STATIC_PAGES: Result[] = [
  { label: "Dashboard",  sub: "Page",    href: "/dashboard" },
  { label: "Users",      sub: "Page",    href: "/dashboard/users" },
  { label: "Products",   sub: "Page",    href: "/dashboard/products" },
  { label: "Inventory",  sub: "Page",    href: "/dashboard/inventory" },
  { label: "Sales",      sub: "Page",    href: "/dashboard/sales" },
  { label: "Reports",    sub: "Page",    href: "/dashboard/reports" },
];

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    const q = query.toLowerCase();
    const pageMatches = STATIC_PAGES.filter((p) => p.label.toLowerCase().includes(q));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: Result[] = await res.json();
        setResults([...pageMatches, ...data]);
      } catch {
        setResults(pageMatches);
      }
      setOpen(true);
      setActive(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
    if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    if (e.key === "Enter" && results[active]) go(results[active].href);
    if (e.key === "Escape") setOpen(false);
  }

  function go(href: string) {
    router.push(href);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-72">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => query && setOpen(true)}
        placeholder="Search users, products, pages..."
        className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={r.href + r.label}
              onClick={() => go(r.href)}
              className={`w-full text-left px-4 py-2.5 text-sm flex justify-between items-center ${
                i === active ? "bg-blue-50 dark:bg-slate-700" : "hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <span className="font-medium text-gray-800 dark:text-slate-100">{r.label}</span>
              <span className="text-xs text-gray-400 dark:text-slate-400">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
