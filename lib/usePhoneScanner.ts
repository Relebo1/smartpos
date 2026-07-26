import { useEffect, useRef, useState } from "react";

/**
 * Pairs a phone scanner session and polls for barcodes.
 * Returns the token (truthy = modal should be shown) and a way to start/stop.
 */
export function usePhoneScanner(
  orgId: number,
  onBarcode: (barcode: string) => void
) {
  const [token, setToken] = useState<string | null>(null);
  const onBarcodeRef = useRef(onBarcode);
  onBarcodeRef.current = onBarcode;

  async function connect() {
    const res = await fetch("/api/scanner/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId }),
    });
    const { token: t } = await res.json();
    setToken(t);
  }

  function disconnect() {
    setToken(null);
  }

  useEffect(() => {
    if (!token) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/scanner/poll?token=${token}`);
      if (res.status === 404) { setToken(null); return; }
      const { barcode } = await res.json();
      if (barcode) onBarcodeRef.current(barcode);
    }, 800);
    return () => clearInterval(id);
  }, [token]);

  return { token, connect, disconnect };
}
