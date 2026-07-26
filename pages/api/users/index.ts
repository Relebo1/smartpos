import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Resolve which org to operate on:
// - Platform users pass ?organizationId=X
// - Org admins always use their own org from session
function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) {
    return Number(query.organizationId) || null;
  }
  return session.user.organizationId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const isPlatform = PLATFORM_ROLES.includes(session.user.role);
  const isOrgAdmin = session.user.role === "ORGANIZATION_ADMIN";

  if (!isPlatform && !isOrgAdmin) return res.status(403).json({ error: "Forbidden" });

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  if (req.method === "GET") {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });
    return res.json(users);
  }

  if (req.method === "POST") {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });

    const allowedRoles = ["ORGANIZATION_ADMIN", "CASHIER"];
    const assignedRole = allowedRoles.includes(role) ? role : "CASHIER";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: assignedRole,
        organizationId: orgId,
      },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
