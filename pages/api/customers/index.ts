import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) return Number(query.organizationId) || null;
  return session.user.organizationId ?? null;
}

async function ensureWalkIn(orgId: number) {
  const existing = await prisma.customer.findFirst({ where: { organizationId: orgId, isWalkIn: true } });
  if (existing) return existing;
  return prisma.customer.create({
    data: { organizationId: orgId, name: "Walk-in Customer", customerType: "WALK_IN", isWalkIn: true },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  if (req.method === "GET") {
    await ensureWalkIn(orgId);
    const { search } = req.query;
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: String(search) } },
                { phone: { contains: String(search) } },
                { email: { contains: String(search) } },
              ],
            }
          : {}),
      },
      orderBy: [{ isWalkIn: "desc" }, { name: "asc" }],
    });
    return res.json(customers);
  }

  if (req.method === "POST") {
    const { name, email, phone, address, customerType } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        customerType: customerType || "REGULAR",
        isWalkIn: false,
      },
    });
    return res.status(201).json(customer);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
