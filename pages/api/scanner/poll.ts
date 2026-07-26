import { NextApiRequest, NextApiResponse } from "next";
import { consumeBarcode, getSession } from "@/lib/scannerSessions";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }

  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).json({ error: "token is required" });

  const session = getSession(token);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  const barcode = consumeBarcode(token);
  return res.status(200).json({ barcode });
}
