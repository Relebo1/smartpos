import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Platform users (no org) ──────────────────────────────────
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

  // ── Demo organizations ───────────────────────────────────────
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

  // ── Org admins ───────────────────────────────────────────────
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

  // ── Walk-in customers (one per org) ─────────────────────────
  for (const org of [smartMart, oasis]) {
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
}

main().catch(console.error).finally(() => prisma.$disconnect());
