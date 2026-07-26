import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions, PLATFORM_ROLES } from "../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

function resolveOrgId(session: any, query: any): number | null {
  if (PLATFORM_ROLES.includes(session.user.role)) return Number(query.organizationId) || null;
  return session.user.organizationId ?? null;
}

function nextReceiptNumber(orgId: number, count: number): string {
  const pad = String(count + 1).padStart(6, "0");
  return `RCP-${orgId}-${pad}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const orgId = resolveOrgId(session, req.query);
  if (!orgId) return res.status(400).json({ error: "organizationId is required" });

  // ── GET: list sales ──────────────────────────────────────────
  if (req.method === "GET") {
    const { search, paymentMethod, cashierId, dateFrom, dateTo } = req.query;
    const take = Number(req.query.take) || 20;
    const skip = Number(req.query.skip) || 0;

    const where: any = { organizationId: orgId };
    if (search) where.receiptNumber = { contains: String(search) };
    if (cashierId) where.cashierId = Number(cashierId);
    if (paymentMethod) where.payments = { some: { method: String(paymentMethod) } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) {
        const end = new Date(String(dateTo));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          cashier: { select: { name: true } },
          payments: true,
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.sale.count({ where }),
    ]);

    return res.json({ sales, total });
  }

  // ── POST: create sale ────────────────────────────────────────
  if (req.method === "POST") {
    const { customerId, items, discount, tax, paymentMethod, amountPaid, paymentReference, notes } = req.body;

    if (!items?.length) return res.status(400).json({ error: "At least one item is required" });
    if (!paymentMethod) return res.status(400).json({ error: "Payment method is required" });

    // Validate & fetch products
    const productIds: number[] = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: orgId, status: "ACTIVE" },
    });

    if (products.length !== productIds.length)
      return res.status(400).json({ error: "One or more products not found or inactive" });

    // Check stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.quantity < item.quantity)
        return res.status(400).json({ error: `Insufficient stock for "${product.name}" (available: ${product.quantity})` });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineDiscount = Number(item.discount ?? 0);
      return sum + Number(product.sellingPrice) * item.quantity - lineDiscount;
    }, 0);

    const discountAmt = Number(discount ?? 0);
    const taxAmt = Number(tax ?? 0);
    const total = subtotal - discountAmt + taxAmt;
    const paid = Number(amountPaid ?? total);

    // Generate receipt number
    const saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
    const receiptNumber = nextReceiptNumber(orgId, saleCount);

    // Resolve customer — default to Walk-in
    let resolvedCustomerId: number | null = customerId ? Number(customerId) : null;
    if (!resolvedCustomerId) {
      const walkIn = await prisma.customer.findFirst({ where: { organizationId: orgId, isWalkIn: true } });
      if (walkIn) resolvedCustomerId = walkIn.id;
    }

    // Atomic transaction
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          organizationId: orgId,
          cashierId: Number(session.user.id),
          customerId: resolvedCustomerId,
          receiptNumber,
          subtotal,
          discount: discountAmt,
          tax: taxAmt,
          total,
          notes: notes || null,
          items: {
            create: items.map((item: any) => {
              const product = products.find((p) => p.id === item.productId)!;
              const lineDiscount = Number(item.discount ?? 0);
              const lineTotal = Number(product.sellingPrice) * item.quantity - lineDiscount;
              return {
                productId: item.productId,
                name: product.name,
                quantity: item.quantity,
                unitPrice: product.sellingPrice,
                discount: lineDiscount,
                lineTotal,
              };
            }),
          },
          payments: {
            create: {
              organizationId: orgId,
              method: paymentMethod,
              amount: paid,
              reference: paymentReference || null,
            },
          },
        },
        include: {
          items: true,
          payments: true,
          customer: { select: { name: true } },
          cashier: { select: { name: true } },
        },
      });

      // Deduct stock + create inventory transactions
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            organizationId: orgId,
            productId: item.productId,
            type: "SALE",
            quantity: item.quantity,
            referenceNumber: receiptNumber,
            notes: `Sale ${receiptNumber}`,
            performedBy: session.user.name,
          },
        });
      }

      return created;
    });

    return res.status(201).json(sale);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end();
}
