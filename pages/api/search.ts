import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "./auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json([]);

  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);

  const isPlatform = PLATFORM_ROLES.includes(session.user.role);
  const orgId = isPlatform ? Number(req.query.organizationId) || null : session.user.organizationId;

  if (!orgId) return res.json([]);

  const users = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true, name: { contains: q } },
    select: { id: true, name: true, role: true },
    take: 5,
  });

  return res.json(users.map((u) => ({ label: u.name, sub: u.role, href: "/dashboard/users" })));
}
