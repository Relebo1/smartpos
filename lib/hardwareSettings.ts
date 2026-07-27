export type PaperSize = "58mm" | "80mm";

export type HardwareSettings = {
  // Scanner
  scannerEnabled: boolean;
  scanTimeout: number;       // ms between keystrokes to detect scanner vs human (default 50)
  requireEnterKey: boolean;  // if false, fire on timeout alone
  autoAddQty: number;        // quantity to add per scan (default 1)
  soundOnScan: boolean;

  // Printer
  paperSize: PaperSize;
  autoPrint: boolean;
  printCopies: number;
  footerMessage: string;
  logoUrl: string;
};

export const DEFAULT_SETTINGS: HardwareSettings = {
  scannerEnabled: true,
  scanTimeout: 50,
  requireEnterKey: true,
  autoAddQty: 1,
  soundOnScan: true,
  paperSize: "80mm",
  autoPrint: false,
  printCopies: 1,
  footerMessage: "Thank you for your business!",
  logoUrl: "",
};

const KEY = "smartpos_hw_settings";

export function loadSettings(): HardwareSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: HardwareSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
