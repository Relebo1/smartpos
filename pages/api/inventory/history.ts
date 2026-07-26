import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) return Number(query.organizationId) || null;
  return session.user.organizationId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  const take = Math.min(Number(req.query.take) || 50, 100);
  const skip = Number(req.query.skip) || 0;

  const [transactions, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where: { organizationId: orgId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.inventoryTransaction.count({ where: { organizationId: orgId } }),
  ]);

  return res.json({ transactions, total });
}
