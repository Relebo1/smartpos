import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Platform users ───────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@smartpos.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@smartpos.com",
      password: await bcrypt.hash("admin123", 10),
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "support@smartpos.com" },
    update: {},
    create: {
      name: "Support Admin",
      email: "support@smartpos.com",
      password: await bcrypt.hash("admin123", 10),
      role: "SUPPORT_ADMIN",
    },
  });

  // ── Organizations ────────────────────────────────────────────
  const smartMart = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Smart Mart Demo",
      email: "info@smartmart.com",
      phone: "+266 5000 0000",
      address: "Maseru, Lesotho",
      status: "ACTIVE",
    },
  });

  const oasis = await prisma.organization.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Oasis Grocery",
      email: "info@oasis.com",
      phone: "+266 5000 0001",
      address: "Leribe, Lesotho",
      status: "TRIAL",
    },
  });

  // ── Org users ────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@smartmart.com" },
    update: {},
    create: {
      name: "Smart Mart Admin",
      email: "admin@smartmart.com",
      password: await bcrypt.hash("demo123", 10),
      role: "ORGANIZATION_ADMIN",
      organizationId: smartMart.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@smartmart.com" },
    update: {},
    create: {
      name: "Smart Mart Cashier",
      email: "cashier@smartmart.com",
      password: await bcrypt.hash("cashier123", 10),
      role: "CASHIER",
      organizationId: smartMart.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@oasis.com" },
    update: {},
    create: {
      name: "Oasis Admin",
      email: "admin@oasis.com",
      password: await bcrypt.hash("demo123", 10),
      role: "ORGANIZATION_ADMIN",
      organizationId: oasis.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@oasis.com" },
    update: {},
    create: {
      name: "Oasis Cashier",
      email: "cashier@oasis.com",
      password: await bcrypt.hash("cashier123", 10),
      role: "CASHIER",
      organizationId: oasis.id,
    },
  });

  console.log("✅ Seeded users and organizations");

  // ── Categories ───────────────────────────────────────────────
  const categoryNames = ["Beverages", "Snacks", "Dairy", "Household", "Personal Care"];
  const categories: Record<string, number> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat.id;
  }

  console.log("✅ Seeded categories");

  // ── Demo products for Smart Mart ─────────────────────────────
  const products = [
    { name: "Coca-Cola 500ml", barcode: "5000112637922", categoryId: categories["Beverages"], buyingPrice: 8, sellingPrice: 12, quantity: 50 },
    { name: "Fanta Orange 500ml", barcode: "5000112637923", categoryId: categories["Beverages"], buyingPrice: 8, sellingPrice: 12, quantity: 40 },
    { name: "Lay's Chips 100g", barcode: "4890008100309", categoryId: categories["Snacks"], buyingPrice: 10, sellingPrice: 15, quantity: 30 },
    { name: "Simba Chips 125g", barcode: "6001068000001", categoryId: categories["Snacks"], buyingPrice: 9, sellingPrice: 14, quantity: 35 },
    { name: "Full Cream Milk 1L", barcode: "6001234500001", categoryId: categories["Dairy"], buyingPrice: 18, sellingPrice: 25, quantity: 20, minimumStock: 5 },
    { name: "Cheese Slices 200g", barcode: "6001234500002", categoryId: categories["Dairy"], buyingPrice: 22, sellingPrice: 32, quantity: 15, minimumStock: 3 },
    { name: "Sunlight Dishwash 500ml", barcode: "6001087000001", categoryId: categories["Household"], buyingPrice: 20, sellingPrice: 30, quantity: 25 },
    { name: "Handy Andy 750ml", barcode: "6001087000002", categoryId: categories["Household"], buyingPrice: 18, sellingPrice: 28, quantity: 20 },
    { name: "Dove Soap 100g", barcode: "8710908990007", categoryId: categories["Personal Care"], buyingPrice: 15, sellingPrice: 22, quantity: 40 },
    { name: "Colgate Toothpaste 75ml", barcode: "8714789710005", categoryId: categories["Personal Care"], buyingPrice: 20, sellingPrice: 30, quantity: 30 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { organizationId: smartMart.id, name: p.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          organizationId: smartMart.id,
          name: p.name,
          barcode: p.barcode,
          categoryId: p.categoryId,
          buyingPrice: p.buyingPrice,
          sellingPrice: p.sellingPrice,
          quantity: p.quantity,
          minimumStock: p.minimumStock ?? 0,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("✅ Seeded demo products");

  // ── Pay Lesotho ─────────────────────────────────────────────
  const payLesotho = await prisma.organization.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Pay Lesotho",
      email: "info@paylesotho.co.ls",
      phone: "+266 5000 0002",
      address: "Maseru, Lesotho",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@paylesotho.co.ls" },
    update: {},
    create: {
      name: "Pay Lesotho Admin",
      email: "admin@paylesotho.co.ls",
      password: await bcrypt.hash("admin123", 10),
      role: "ORGANIZATION_ADMIN",
      organizationId: payLesotho.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@paylesotho.co.ls" },
    update: {},
    create: {
      name: "Pay Lesotho Cashier",
      email: "cashier@paylesotho.co.ls",
      password: await bcrypt.hash("cashier123", 10),
      role: "CASHIER",
      organizationId: payLesotho.id,
    },
  });

  console.log("✅ Seeded Pay Lesotho");

  // ── Walk-in customers ────────────────────────────────────────
  for (const org of [smartMart, oasis, payLesotho]) {
    const existing = await prisma.customer.findFirst({
      where: { organizationId: org.id, isWalkIn: true },
    });
    if (!existing) {
      await prisma.customer.create({
        data: {
          organizationId: org.id,
          name: "Walk-in Customer",
          customerType: "WALK_IN",
          isWalkIn: true,
        },
      });
    }
  }

  console.log("✅ Seeded walk-in customers");
  console.log("\n📋 Login credentials:");
  console.log("  Super Admin  : admin@smartpos.com    / admin123");
  console.log("  Support Admin: support@smartpos.com  / admin123");
  console.log("  SM Admin     : admin@smartmart.com   / demo123");
  console.log("  SM Cashier   : cashier@smartmart.com / cashier123");
  console.log("  Oasis Admin  : admin@oasis.com            / demo123");
  console.log("  Oasis Cashier: cashier@oasis.com          / cashier123");
  console.log("  PL Admin     : admin@paylesotho.co.ls     / admin123");
  console.log("  PL Cashier   : cashier@paylesotho.co.ls   / cashier123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
