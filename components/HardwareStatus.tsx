import { useEffect, useState } from "react";
import { ScanBarcode, Printer } from "lucide-react";
import type { HardwareSettings } from "@/lib/hardwareSettings";

type Props = { settings: HardwareSettings };

export default function HardwareStatus({ settings }: Props) {
  const [printerReady, setPrinterReady] = useState(false);

  // Printer readiness: browser print API is always available; we mark ready after mount
  useEffect(() => { setPrinterReady(true); }, []);

  const scannerOn = settings.scannerEnabled;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
        <ScanBarcode size={13} />
        <span className={`w-1.5 h-1.5 rounded-full ${scannerOn ? "bg-green-500" : "bg-gray-400"}`} />
        <span>{scannerOn ? "Scanner ready" : "Scanner off"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
        <Printer size={13} />
        <span className={`w-1.5 h-1.5 rounded-full ${printerReady ? "bg-green-500" : "bg-yellow-400"}`} />
        <span>{printerReady ? "Printer ready" : "Checking…"}</span>
      </div>
    </div>
  );
}
