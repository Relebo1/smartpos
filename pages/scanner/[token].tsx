import { useRouter } from "next/router";
import { useState, useCallback, useEffect, useRef } from "react";
import { ScanBarcode, CheckCircle, XCircle, CameraOff, FlipHorizontal } from "lucide-react";

type Status = "idle" | "scanning" | "sending" | "success" | "error" | "expired";
type FacingMode = "environment" | "user";

const SCANNER_ID = "html5qr-scanner";

export default function PhoneScannerPage() {
  const { query } = useRouter();
  const token = String(query.token ?? "");

  const [status, setStatus] = useState<Status>("idle");
  const [lastBarcode, setLastBarcode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [facing, setFacing] = useState<FacingMode>("environment");

  const scannerRef = useRef<any>(null);
  const activeRef = useRef(false);
  const scannedAudio = useRef<HTMLAudioElement | null>(null);
  const errorAudio = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);

  // Preload + unlock audio on first touch
  useEffect(() => {
    scannedAudio.current = new Audio("/sounds/scanned.mp3");
    errorAudio.current = new Audio("/sounds/error.mp3");
    scannedAudio.current.load();
    errorAudio.current.load();

    const unlock = () => {
      if (audioUnlocked.current) return;
      audioUnlocked.current = true;
      [scannedAudio.current, errorAudio.current].forEach((a) => {
        if (!a) return;
        a.volume = 0;
        a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => {});
      });
    };
    document.addEventListener("touchstart", unlock);
    document.addEventListener("click", unlock);
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  function playSound(type: "scanned" | "error") {
    const audio = type === "scanned" ? scannedAudio.current : errorAudio.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  const sendBarcode = useCallback(async (barcode: string) => {
    activeRef.current = false;
    setStatus("sending");
    setLastBarcode(barcode);
    try {
      const res = await fetch("/api/scanner/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, barcode }),
      });
      if (res.status === 404) { setStatus("expired"); return; }
      if (!res.ok) { playSound("error"); setErrorMsg("Failed to send barcode"); setStatus("error"); return; }
      playSound("scanned");
      setStatus("success");
      setTimeout(() => { activeRef.current = true; setStatus("scanning"); }, 1500);
    } catch {
      playSound("error");
      setErrorMsg("Network error");
      setStatus("error");
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    setStatus("scanning");
  }, [token]);

  // Start/stop html5-qrcode scanner
  useEffect(() => {
    if (status !== "scanning") return;

    let stopped = false;
    activeRef.current = true;

    const start = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Stop previous instance if any
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }

      if (stopped) return;

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: facing },
          { fps: 15, qrbox: { width: 250, height: 180 }, aspectRatio: 1.5 },
          (decodedText) => {
            if (!activeRef.current) return;
            sendBarcode(decodedText);
          },
          () => {} // ignore per-frame errors
        );
      } catch (err: any) {
        if (stopped) return;
        if (/permission|notallowed/i.test(err?.message ?? ""))
          setPermissionDenied(true);
        else {
          setErrorMsg("Camera error: " + (err?.message ?? err));
          setStatus("error");
        }
      }
    };

    start();

    return () => {
      stopped = true;
      activeRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [status, facing, sendBarcode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return <ErrorScreen title="Invalid link" body="This scanner link is missing a session token." />;
  if (status === "expired") return <ErrorScreen title="Session expired" body="The POS session has ended. Ask the cashier to generate a new QR code." />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <ScanBarcode size={18} className="text-blue-400" />
        <span className="text-sm font-semibold text-white">SmartPOS Scanner</span>
        <button
          onClick={() => setFacing((f) => f === "environment" ? "user" : "environment")}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-700"
        >
          <FlipHorizontal size={16} />
          {facing === "environment" ? "Selfie" : "Back"}
        </button>
      </div>

      <div className="flex-1 relative bg-black flex flex-col overflow-hidden">
        {permissionDenied ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white text-center px-6">
            <CameraOff size={40} className="opacity-60" />
            <p className="text-sm font-medium">Camera access denied</p>
            <p className="text-xs opacity-60">Allow camera permission in your browser settings and try again.</p>
          </div>
        ) : (
          <>
            {/* html5-qrcode mounts into this div */}
            <div id={SCANNER_ID} className="w-full flex-1" />

            {/* Status toasts */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-10 px-4 pointer-events-none">
              {status === "success" && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-900/90 border border-green-600 rounded-xl text-green-300 text-sm">
                  <CheckCircle size={16} /> Sent: {lastBarcode}
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/90 border border-red-600 rounded-xl text-red-300 text-sm">
                  <XCircle size={16} /> {errorMsg}
                </div>
              )}
              {status === "sending" && (
                <div className="text-gray-300 text-sm animate-pulse bg-black/70 px-4 py-2 rounded-xl">
                  Sending…
                </div>
              )}
              {status === "scanning" && (
                <p className="text-white/60 text-xs bg-black/50 px-3 py-1.5 rounded-lg">
                  Point camera at a barcode
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-3">
      <XCircle size={40} className="text-red-400" />
      <p className="text-white font-semibold">{title}</p>
      <p className="text-gray-400 text-sm">{body}</p>
    </div>
  );
}
