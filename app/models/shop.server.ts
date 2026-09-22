import db from "../db.server";

export async function getOrCreateShop(domain: string) {
  const shop = await db.shop.findUnique({ where: { domain } });
  if (shop) {
    if (shop.uninstalledAt) {
      return db.shop.update({
        where: { id: shop.id },
        data: { uninstalledAt: null },
      });
    }
    return shop;
  }

  return db.shop.create({
    data: {
      domain,
      settings: { create: {} },
      subscription: { create: {} },
    },
  });
}
