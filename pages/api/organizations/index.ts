import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !PLATFORM_ROLES.includes(session.user.role))
    return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    });
    return res.json(orgs);
  }

  if (req.method === "POST") {
    if (session.user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Forbidden" });
    const { name, email, phone, address, status } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const org = await prisma.organization.create({
      data: { name, email, phone, address, status: status ?? "TRIAL" },
    });
    return res.status(201).json(org);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
