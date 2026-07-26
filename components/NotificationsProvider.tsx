import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type Notification = { id: number; message: string; type: "success" | "error" | "info" };

type NotifContextType = {
  notify: (message: string, type?: Notification["type"]) => void;
};

const NotifContext = createContext<NotifContextType>({ notify: () => {} });

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: Notification["type"] = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }, []);

  const colors = { success: "bg-green-500", error: "bg-red-500", info: "bg-blue-500" };
  const icons = { success: <CheckCircle size={16} />, error: <XCircle size={16} />, info: <Info size={16} /> };

  return (
    <NotifContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n.id} className={`${colors[n.type]} text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64`}>
            {icons[n.type]}
            <span className="flex-1">{n.message}</span>
            <button onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))} className="opacity-70 hover:opacity-100"><X size={14} /></button>
          </div>
        ))}
      </div>
    </NotifContext.Provider>
  );
}

export const useNotify = () => useContext(NotifContext).notify;
