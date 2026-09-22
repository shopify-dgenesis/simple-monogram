import type { Plan } from "@prisma/client";
import db from "../db.server";
import { assertTemplateOwnership } from "./template.server";

export const PLAN_PRODUCT_LIMITS: Record<Plan, number | null> = {
  FREE: 5,
  PRO: null,
};

export interface AssignProductsResult {
  assigned: string[];
  skipped: string[];
  limit: number | null;
}

export async function assignProducts(
  shopId: string,
  templateId: string,
  shopifyProductIds: string[],
): Promise<AssignProductsResult> {
  await assertTemplateOwnership(shopId, templateId);
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  const limit = PLAN_PRODUCT_LIMITS[shop.plan];

  const existing = await db.productAssignment.findMany({
    where: { shopId, shopifyProductId: { in: shopifyProductIds } },
  });
  const existingByProduct = new Map(existing.map((a) => [a.shopifyProductId, a]));

  const currentActiveCount = await db.productAssignment.count({
    where: { shopId, enabled: true },
  });

  let remainingSlots = limit === null ? Infinity : limit - currentActiveCount;

  const assigned: string[] = [];
  const skipped: string[] = [];

  for (const shopifyProductId of shopifyProductIds) {
    const wasEnabled = existingByProduct.get(shopifyProductId)?.enabled ?? false;
    const needsNewSlot = !wasEnabled;

    if (needsNewSlot && remainingSlots <= 0) {
      skipped.push(shopifyProductId);
      continue;
    }

    await db.productAssignment.upsert({
      where: { shopId_shopifyProductId: { shopId, shopifyProductId } },
      create: {
        shopId,
        templateId,
        shopifyProductId,
        assignmentSource: "MANUAL",
        enabled: true,
      },
      update: { templateId, enabled: true, assignmentSource: "MANUAL" },
    });

    if (needsNewSlot) remainingSlots -= 1;
    assigned.push(shopifyProductId);
  }

  return { assigned, skipped, limit };
}

export class PlanLimitReachedError extends Error {
  constructor() {
    super("PLAN_LIMIT_REACHED");
  }
}

export async function setAssignmentEnabled(
  shopId: string,
  assignmentId: string,
  enabled: boolean,
) {
  if (enabled) {
    const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
    const limit = PLAN_PRODUCT_LIMITS[shop.plan];
    if (limit !== null) {
      const activeCount = await db.productAssignment.count({
        where: { shopId, enabled: true, id: { not: assignmentId } },
      });
      if (activeCount >= limit) {
        throw new PlanLimitReachedError();
      }
    }
  }

  return db.productAssignment.update({
    where: { id: assignmentId, shopId },
    data: { enabled },
  });
}

export async function removeAssignment(shopId: string, assignmentId: string) {
  return db.productAssignment.delete({ where: { id: assignmentId, shopId } });
}
