import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const orgId = PLATFORM_ROLES.includes(session.user.role)
    ? Number(req.query.organizationId) || null
    : session.user.organizationId ?? null;
  if (!orgId) return res.status(400).json({ error: "organizationId required" });

  const [products, categories, customers, cashiers] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId, isWalkIn: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId, role: "CASHIER", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return res.json({
    products,
    categories,
    customers,
    cashiers,
    paymentMethods: [
      { id: "CASH",          label: "Cash" },
      { id: "CARD",          label: "Card" },
      { id: "MOBILE_MONEY",  label: "Mobile Money" },
      { id: "BANK_TRANSFER", label: "Bank Transfer" },
    ],
  });
}
