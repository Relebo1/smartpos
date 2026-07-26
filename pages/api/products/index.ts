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

  if (req.method === "GET") {
    const { search, categoryId } = req.query;
    const { barcode } = req.query;
    // Exact barcode lookup — used by scanner
    if (barcode) {
      const product = await prisma.product.findFirst({
        where: { organizationId: orgId, status: "ACTIVE", barcode: String(barcode) },
        include: { category: true },
      });
      return res.json(product ? [product] : []);
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: String(search) } },
                { barcode: { contains: String(search) } },
                { description: { contains: String(search) } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(products);
  }

  if (req.method === "POST") {
    if (session.user.role === "SUPPORT_ADMIN") return res.status(403).json({ error: "Forbidden" });
    const { name, description, barcode, categoryName, supplier, buyingPrice, sellingPrice, quantity, minimumStock, image } = req.body;
    if (!name || !buyingPrice || !sellingPrice) return res.status(400).json({ error: "Name, buying price and selling price are required" });

    let categoryId: number | undefined;
    if (categoryName?.trim()) {
      const cat = await prisma.category.upsert({
        where: { name: categoryName.trim() },
        update: {},
        create: { name: categoryName.trim() },
      });
      categoryId = cat.id;
    }

    const product = await prisma.product.create({
      data: {
        organizationId: orgId,
        name,
        description,
        barcode,
        categoryId,
        supplier,
        buyingPrice,
        sellingPrice,
        quantity: quantity ?? 0,
        minimumStock: minimumStock ?? 0,
        image,
      },
      include: { category: true },
    });
    return res.status(201).json(product);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
