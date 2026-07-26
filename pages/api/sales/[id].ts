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

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  const id = Number(req.query.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, image: true } } } },
      payments: true,
      customer: { select: { name: true, phone: true } },
      cashier: { select: { name: true } },
    },
  });

  if (!sale || sale.organizationId !== orgId)
    return res.status(404).json({ error: "Sale not found" });

  if (req.method === "GET") return res.json(sale);

  if (req.method === "PATCH") {
    // Only SUPER_ADMIN and ORGANIZATION_ADMIN can void
    if (session.user.role === "SUPPORT_ADMIN")
      return res.status(403).json({ error: "Support admins cannot void sales" });

    if (sale.saleStatus !== "COMPLETED")
      return res.status(400).json({ error: "Only completed sales can be voided" });

    const voided = await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: { saleStatus: "VOIDED" },
        include: {
          items: true,
          payments: true,
          customer: { select: { name: true } },
          cashier: { select: { name: true } },
        },
      });

      // Restore stock
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            organizationId: orgId,
            productId: item.productId,
            type: "RETURN",
            quantity: item.quantity,
            referenceNumber: sale.receiptNumber,
            notes: `Void of ${sale.receiptNumber}`,
            performedBy: session.user.name,
          },
        });
      }

      return updated;
    });

    return res.json(voided);
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  res.status(405).end();
}
