import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Smartphone, Link2 } from "lucide-react";

export default function PhonePairModal({
  token,
  orgId,
  onClose,
}: {
  token: string;
  orgId: number;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const scannerUrl = `${window.location.origin}/scanner/${token}`;
  const navigatedRef = useRef(false);

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // On mobile: navigate directly to the scanner page instead of showing QR
  useEffect(() => {
    if (isMobile && !navigatedRef.current) {
      navigatedRef.current = true;
      window.location.href = scannerUrl;
    }
  }, [isMobile, scannerUrl]);

  useEffect(() => {
    if (isMobile) return;
    QRCode.toDataURL(scannerUrl, { width: 240, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(setQrDataUrl);
  }, [isMobile, scannerUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Connect Phone</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Scan this QR code with your phone to use it as a barcode scanner.
        </p>

        {qrDataUrl
          ? <img src={qrDataUrl} alt="Scanner QR code" className="rounded-xl border border-gray-200 dark:border-slate-600" width={200} height={200} />
          : <div className="w-[200px] h-[200px] bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
        }

        {/* Copyable URL fallback */}
        <div className="w-full flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
          <Link2 size={12} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 dark:text-slate-400 truncate flex-1">{scannerUrl}</span>
          <button
            onClick={() => navigator.clipboard.writeText(scannerUrl)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            Copy
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          Session active for 10 minutes · Phone only has scanning access
        </p>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          Done — keep scanning
        </button>
      </div>
    </div>
  );
}
