import { useState, useEffect, useRef } from "react";
import { Bell, Circle, CheckCheck } from "lucide-react";

type Notif = { id: number; message: string; read: boolean; time: string };

const MOCK: Notif[] = [
  { id: 1, message: "Low stock: Coca Cola 500ml (3 left)",  read: false, time: "2m ago" },
  { id: 2, message: "New user registered: Relebohile",      read: false, time: "1h ago" },
  { id: 3, message: "Daily sales report is ready",          read: true,  time: "3h ago" },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(MOCK);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition relative"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-100">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y dark:divide-slate-700">
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 text-sm flex gap-3 items-start ${n.read ? "opacity-40" : ""}`}>
                <Circle size={8} className={`mt-1.5 shrink-0 ${n.read ? "text-gray-300 dark:text-slate-600" : "text-blue-500 fill-blue-500"}`} />
                <div className="flex-1">
                  <p className="text-gray-800 dark:text-slate-100">{n.message}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
