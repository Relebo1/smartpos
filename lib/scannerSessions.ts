import { prisma } from "@/lib/prisma";

const TTL_MS = 10 * 60 * 1000;

export async function createSession(orgId: number): Promise<string> {
  const token = crypto.randomUUID();
  await prisma.scannerSession.create({
    data: { token, orgId, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  return token;
}

export async function getSession(token: string) {
  const s = await prisma.scannerSession.findUnique({ where: { token } });
  if (!s) return null;
  if (Date.now() > s.expiresAt.getTime()) {
    await prisma.scannerSession.delete({ where: { token } });
    return null;
  }
  // sliding expiry
  return prisma.scannerSession.update({
    where: { token },
    data: { expiresAt: new Date(Date.now() + TTL_MS) },
  });
}

export async function pushBarcode(token: string, barcode: string): Promise<boolean> {
  const s = await getSession(token);
  if (!s) return false;
  await prisma.scannerSession.update({ where: { token }, data: { barcode } });
  return true;
}

export async function consumeBarcode(token: string): Promise<string | null> {
  const s = await getSession(token);
  if (!s || !s.barcode) return null;
  await prisma.scannerSession.update({ where: { token }, data: { barcode: null } });
  return s.barcode;
}
