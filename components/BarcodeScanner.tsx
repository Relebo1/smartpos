import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, CameraOff } from "lucide-react";

const HINTS: Map<DecodeHintType, any> = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR, BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417,
]);
HINTS.set(DecodeHintType.TRY_HARDER, true);

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS);
    let stopped = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result, err, controls) => {
          if (stopped) return;
          if (result) {
            stopped = true;
            controls.stop();
            onDetected(result.getText());
          }
          if (err?.name === "NotAllowedError") {
            setPermissionDenied(true);
          }
        }
      )
      .then(() => { if (!stopped) setScanning(true); })
      .catch((err) => {
        if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
          setPermissionDenied(true);
        }
      });

    return () => {
      stopped = true;
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black" onClick={onClose}>
      <div className="relative w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
        >
          <X size={18} />
        </button>

        {permissionDenied ? (
          <div className="flex flex-col items-center gap-3 py-16 text-white text-center px-6">
            <CameraOff size={40} className="opacity-60" />
            <p className="text-sm font-medium">Camera access denied</p>
            <p className="text-xs opacity-60">Allow camera permission in your browser settings and try again.</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Viewfinder */}
            <div className={`relative rounded-xl overflow-hidden ${scanning ? "ring-2 ring-blue-400" : ""}`}>
              <video ref={videoRef} className="w-full" playsInline muted />

              {/* Scan line animation */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-4 right-4 h-0.5 bg-blue-400/80 animate-scan-line" />
                  {/* Corner markers */}
                  {[["top-2 left-2", "border-t-2 border-l-2"],
                    ["top-2 right-2", "border-t-2 border-r-2"],
                    ["bottom-2 left-2", "border-b-2 border-l-2"],
                    ["bottom-2 right-2", "border-b-2 border-r-2"],
                  ].map(([pos, border]) => (
                    <div key={pos} className={`absolute ${pos} w-6 h-6 ${border} border-blue-400 rounded-sm`} />
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-white/70 text-xs mt-3">
              {scanning ? "Point camera at a barcode" : "Starting camera…"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
