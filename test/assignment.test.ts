import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";
import { createTemplate } from "../app/models/template.server";
import type { TemplateRuleInput } from "../app/models/template.server";
import {
  assignProducts,
  PlanLimitReachedError,
  removeAssignment,
  setAssignmentEnabled,
} from "../app/models/assignment.server";

const shopIds: string[] = [];

afterEach(async () => {
  while (shopIds.length > 0) {
    const id = shopIds.pop();
    if (id) await cleanupShop(id);
  }
});

async function makeShop(plan: "FREE" | "PRO" = "FREE") {
  const shop = await createTestShop(`test-${randomUUID()}`);
  if (plan === "PRO") {
    await prisma.shop.update({ where: { id: shop.id }, data: { plan: "PRO" } });
  }
  shopIds.push(shop.id);
  return shop;
}

const baseRules: TemplateRuleInput = {
  name: "Template",
  effect: "PRINT",
  confirmationRequired: false,
  required: true,
  minLength: null,
  maxLength: null,
  allowedCharacters: "LETTERS_AND_NUMBERS",
  customAllowedPattern: null,
  transform: "NONE",
  cleanSpacing: true,
  disableEmoji: true,
  defaultFontId: null,
  allowedFontIds: [],
  allowedColorPaletteIds: [],
};

function productIds(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => `gid://shopify/Product/${offset + i}`);
}

describe("assignment.server — Free plan 5-product limit", () => {
  it("assigns up to the limit and reports the rest as skipped, without ever exceeding it", async () => {
    const shop = await makeShop("FREE");
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    const result = await assignProducts(shop.id, template.id, productIds(8));

    expect(result.assigned).toHaveLength(5);
    expect(result.skipped).toHaveLength(3);
    expect(result.limit).toBe(5);

    const activeCount = await prisma.productAssignment.count({
      where: { shopId: shop.id, enabled: true },
    });
    expect(activeCount).toBe(5);
  });

  it("rejects enabling an assignment via toggle once the limit is already reached", async () => {
    const shop = await makeShop("FREE");
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    await assignProducts(shop.id, template.id, productIds(5));
    // A 6th product, assigned but disabled (simulating a disabled leftover)
    const sixth = await prisma.productAssignment.create({
      data: {
        shopId: shop.id,
        templateId: template.id,
        shopifyProductId: "gid://shopify/Product/999",
        enabled: false,
      },
    });

    await expect(setAssignmentEnabled(shop.id, sixth.id, true)).rejects.toBeInstanceOf(
      PlanLimitReachedError,
    );

    const activeCount = await prisma.productAssignment.count({
      where: { shopId: shop.id, enabled: true },
    });
    expect(activeCount).toBe(5);
  });

  it("does not consume a new slot when reassigning an already-enabled product to a different template", async () => {
    const shop = await makeShop("FREE");
    const templateA = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    const templateB = await createTemplate(shop.id, "NUMBER", baseRules);

    await assignProducts(shop.id, templateA.id, productIds(5));

    // Reassign one of the 5 already-active products to templateB — should succeed
    // without needing a free slot, since it was already counted as active.
    const result = await assignProducts(shop.id, templateB.id, [
      "gid://shopify/Product/0",
    ]);

    expect(result.assigned).toEqual(["gid://shopify/Product/0"]);
    expect(result.skipped).toHaveLength(0);

    const moved = await prisma.productAssignment.findUniqueOrThrow({
      where: {
        shopId_shopifyProductId: {
          shopId: shop.id,
          shopifyProductId: "gid://shopify/Product/0",
        },
      },
    });
    expect(moved.templateId).toBe(templateB.id);

    const activeCount = await prisma.productAssignment.count({
      where: { shopId: shop.id, enabled: true },
    });
    expect(activeCount).toBe(5);
  });

  it("frees a slot when an assignment is disabled, allowing a new one to take its place", async () => {
    const shop = await makeShop("FREE");
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shop.id, template.id, productIds(5));

    const toDisable = await prisma.productAssignment.findFirstOrThrow({
      where: { shopId: shop.id, shopifyProductId: "gid://shopify/Product/0" },
    });
    await setAssignmentEnabled(shop.id, toDisable.id, false);

    const result = await assignProducts(shop.id, template.id, [
      "gid://shopify/Product/new-one",
    ]);
    expect(result.assigned).toEqual(["gid://shopify/Product/new-one"]);

    const activeCount = await prisma.productAssignment.count({
      where: { shopId: shop.id, enabled: true },
    });
    expect(activeCount).toBe(5);
  });

  it("removes an assignment entirely", async () => {
    const shop = await makeShop("FREE");
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    const [assigned] = productIds(1);
    await assignProducts(shop.id, template.id, [assigned]);

    const row = await prisma.productAssignment.findFirstOrThrow({
      where: { shopId: shop.id, shopifyProductId: assigned },
    });
    await removeAssignment(shop.id, row.id);

    const afterRemove = await prisma.productAssignment.findUnique({ where: { id: row.id } });
    expect(afterRemove).toBeNull();
  });
});

describe("assignment.server — Pro plan", () => {
  it("allows unlimited active products", async () => {
    const shop = await makeShop("PRO");
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    const result = await assignProducts(shop.id, template.id, productIds(12));

    expect(result.assigned).toHaveLength(12);
    expect(result.skipped).toHaveLength(0);
    expect(result.limit).toBeNull();
  });
});
