import { NextApiRequest, NextApiResponse } from "next";
import { pushBarcode } from "@/lib/scannerSessions";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  const { token, barcode } = req.body ?? {};
  if (!token || !barcode) return res.status(400).json({ error: "token and barcode are required" });

  const ok = pushBarcode(String(token), String(barcode));
  if (!ok) return res.status(404).json({ error: "Session not found or expired" });

  return res.status(200).json({ ok: true });
}
