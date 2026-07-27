import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) return Number(query.organizationId) || null;
  return session.user.organizationId ?? null;
}

const DECREASE_REASONS = ["Damaged", "Lost", "Expired"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.user.role === "SUPPORT_ADMIN") return res.status(403).json({ error: "Forbidden" });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  const { productId, adjustmentType, quantity, reason, notes } = req.body;
  if (!productId || !quantity || quantity <= 0 || !adjustmentType)
    return res.status(400).json({ error: "productId, adjustmentType and a positive quantity are required" });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.organizationId !== orgId)
    return res.status(404).json({ error: "Product not found" });

  const isDecrease = adjustmentType === "DECREASE";
  if (isDecrease && product.quantity - quantity < 0)
    return res.status(400).json({ error: "Adjustment would result in negative stock" });

  const type = isDecrease ? "ADJUSTMENT_DECREASE" : "ADJUSTMENT_INCREASE";

  const [updated] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { quantity: isDecrease ? { decrement: quantity } : { increment: quantity } },
      include: { category: true },
    }),
    prisma.inventoryTransaction.create({
      data: {
        organizationId: orgId,
        productId,
        type,
        quantity,
        reason,
        notes,
        performedBy: session.user.name ?? session.user.email ?? "System",
      },
    }),
  ]);

  return res.status(201).json(updated);
}
