import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { createSession } from "@/lib/scannerSessions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const orgId: number = session.user.organizationId ?? Number(req.body?.organizationId);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  const token = await createSession(orgId);
  return res.status(201).json({ token });
}
