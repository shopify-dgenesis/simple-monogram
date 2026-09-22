import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function createTestShop(domainSuffix: string) {
  return prisma.shop.create({
    data: {
      domain: `${domainSuffix}.myshopify.com`,
    },
  });
}

export async function cleanupShop(shopId: string) {
  await prisma.shop.delete({ where: { id: shopId } }).catch(() => {
    // already removed by a cascading delete in the test itself
  });
}
