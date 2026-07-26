import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const isPlatform = PLATFORM_ROLES.includes(session.user.role);
  const isOrgAdmin = session.user.role === "ORGANIZATION_ADMIN";
  if (!isPlatform && !isOrgAdmin) return res.status(403).json({ error: "Forbidden" });

  const id = Number(req.query.id);

  // Verify the target user belongs to the correct org
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  // Org admins can only touch users in their own org
  if (isOrgAdmin && target.organizationId !== session.user.organizationId)
    return res.status(403).json({ error: "Forbidden" });

  if (req.method === "PUT") {
    const { name, email, password } = req.body;
    const data: Record<string, unknown> = { name, email };
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });
    return res.json(updated);
  }

  if (req.method === "PATCH") {
    // Deactivate
    if (req.body?.isActive === false || Object.keys(req.body ?? {}).length === 0) {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return res.status(204).end();
    }
    // Update permissions
    if (Array.isArray(req.body?.permissions)) {
      const updated = await prisma.user.update({
        where: { id },
        data: { permissions: req.body.permissions },
        select: { id: true, permissions: true },
      });
      return res.json(updated);
    }
    return res.status(400).json({ error: "Invalid PATCH body" });
  }

  res.setHeader("Allow", ["PUT", "PATCH"]);
  res.status(405).end();
}
