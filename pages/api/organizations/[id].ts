import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN")
    return res.status(403).json({ error: "Forbidden" });

  const id = Number(req.query.id);
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return res.status(404).json({ error: "Organization not found" });

  if (req.method === "PUT") {
    const { name, email, phone, address, status } = req.body;
    const updated = await prisma.organization.update({ where: { id }, data: { name, email, phone, address, status } });
    return res.json(updated);
  }

  if (req.method === "PATCH") {
    const newStatus = org.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const updated = await prisma.organization.update({ where: { id }, data: { status: newStatus } });
    return res.json(updated);
  }

  res.setHeader("Allow", ["PUT", "PATCH"]);
  res.status(405).end();
}
