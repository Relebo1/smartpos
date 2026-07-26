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
  if (session.user.role === "SUPPORT_ADMIN") return res.status(403).json({ error: "Forbidden" });

  const id = Number(req.query.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });
  if (product.organizationId !== orgId) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "PUT") {
    const { name, description, barcode, categoryName, supplier, buyingPrice, sellingPrice, quantity, minimumStock, image } = req.body;
    if (!name || !buyingPrice || !sellingPrice) return res.status(400).json({ error: "Name, buying price and selling price are required" });

    let categoryId: number | null = product.categoryId;
    if (categoryName?.trim()) {
      const cat = await prisma.category.upsert({
        where: { name: categoryName.trim() },
        update: {},
        create: { name: categoryName.trim() },
      });
      categoryId = cat.id;
    } else if (categoryName === "") {
      categoryId = null;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { name, description, barcode, categoryId, supplier, buyingPrice, sellingPrice, quantity, minimumStock, image },
      include: { category: true },
    });
    return res.json(updated);
  }

  if (req.method === "PATCH") {
    // Toggle status ACTIVE <-> INACTIVE (soft delete)
    const updated = await prisma.product.update({
      where: { id },
      data: { status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
      include: { category: true },
    });
    return res.json(updated);
  }

  res.setHeader("Allow", ["PUT", "PATCH"]);
  res.status(405).end();
}
