import { useState } from "react";
import { X, ScanBarcode, Printer } from "lucide-react";
import { HardwareSettings, saveSettings } from "@/lib/hardwareSettings";

type Props = { settings: HardwareSettings; onSave: (s: HardwareSettings) => void; onClose: () => void };

const inputCls = "w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "text-xs text-gray-500 dark:text-slate-400";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-600"}`}
    >
      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function HardwareSettingsModal({ settings, onSave, onClose }: Props) {
  const [s, setS] = useState<HardwareSettings>(settings);
  const set = <K extends keyof HardwareSettings>(k: K, v: HardwareSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  function handleSave() {
    saveSettings(s);
    onSave(s);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hardware Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Scanner */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ScanBarcode size={14} className="text-blue-500" />
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Barcode Scanner</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={labelCls}>Enable scanner</span>
                <Toggle checked={s.scannerEnabled} onChange={(v) => set("scannerEnabled", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Sound on scan</span>
                <Toggle checked={s.soundOnScan} onChange={(v) => set("soundOnScan", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Require Enter key</span>
                <Toggle checked={s.requireEnterKey} onChange={(v) => set("requireEnterKey", v)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={labelCls}>Scan timeout (ms)</span>
                <input type="number" min={20} max={200} value={s.scanTimeout}
                  onChange={(e) => set("scanTimeout", Number(e.target.value))}
                  className="w-20 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={labelCls}>Auto-add quantity</span>
                <input type="number" min={1} max={99} value={s.autoAddQty}
                  onChange={(e) => set("autoAddQty", Math.max(1, Number(e.target.value)))}
                  className="w-20 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700" />

          {/* Printer */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer size={14} className="text-blue-500" />
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Receipt Printer</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={labelCls}>Auto-print after payment</span>
                <Toggle checked={s.autoPrint} onChange={(v) => set("autoPrint", v)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={labelCls}>Paper size</span>
                <select value={s.paperSize} onChange={(e) => set("paperSize", e.target.value as "58mm" | "80mm")}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="80mm">80mm (standard)</option>
                  <option value="58mm">58mm (compact)</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={labelCls}>Print copies</span>
                <input type="number" min={1} max={5} value={s.printCopies}
                  onChange={(e) => set("printCopies", Math.max(1, Number(e.target.value)))}
                  className="w-20 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
              </div>
              <div>
                <label className={`${labelCls} block mb-1`}>Footer message</label>
                <input value={s.footerMessage} onChange={(e) => set("footerMessage", e.target.value)} className={inputCls} placeholder="Thank you for your business!" />
              </div>
              <div>
                <label className={`${labelCls} block mb-1`}>Logo URL (optional)</label>
                <input value={s.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} className={inputCls} placeholder="https://…/logo.png" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition">Cancel</button>
          <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-semibold transition">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
