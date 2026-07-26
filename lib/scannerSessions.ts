export type ScannerSession = {
  orgId: number;
  barcode: string | null;
  expiresAt: number;
};

// Module-level map — persists across requests within the same Node process.
// Suitable for single-server deployments (no Redis needed).
const sessions = new Map<string, ScannerSession>();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createSession(orgId: number): string {
  purgeExpired();
  const token = crypto.randomUUID();
  sessions.set(token, { orgId, barcode: null, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getSession(token: string): ScannerSession | null {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  s.expiresAt = Date.now() + TTL_MS; // sliding expiry on activity
  return s;
}

export function pushBarcode(token: string, barcode: string): boolean {
  const s = getSession(token);
  if (!s) return false;
  s.barcode = barcode;
  return true;
}

export function consumeBarcode(token: string): string | null {
  const s = getSession(token);
  if (!s || !s.barcode) return null;
  const barcode = s.barcode;
  s.barcode = null;
  return barcode;
}

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now > v.expiresAt) sessions.delete(k);
  }
}
