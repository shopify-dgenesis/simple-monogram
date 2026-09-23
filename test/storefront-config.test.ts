import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";
import { createTemplate } from "../app/models/template.server";
import type { TemplateRuleInput } from "../app/models/template.server";
import { assignProducts, setAssignmentEnabled } from "../app/models/assignment.server";
import { upsertPreviewZone } from "../app/models/zone.server";
import {
  getStorefrontConfig,
  normalizeProductGid,
} from "../app/models/storefront-config.server";

const shopIds: string[] = [];

afterEach(async () => {
  while (shopIds.length > 0) {
    const id = shopIds.pop();
    if (id) await cleanupShop(id);
  }
});

async function makeShop() {
  const shop = await createTestShop(`test-${randomUUID()}`);
  shopIds.push(shop.id);
  return shop;
}

const baseRules: TemplateRuleInput = {
  name: "Engraved Wallet",
  effect: "ENGRAVING",
  confirmationRequired: true,
  required: true,
  minLength: 1,
  maxLength: 10,
  allowedCharacters: "LETTERS_ONLY",
  customAllowedPattern: null,
  transform: "UPPERCASE",
  cleanSpacing: true,
  disableEmoji: true,
  defaultFontId: null,
  allowedFontIds: [],
  allowedColorPaletteIds: [],
};

describe("normalizeProductGid", () => {
  it("converts a plain numeric id (as Liquid's product.id renders it) into a GID", () => {
    expect(normalizeProductGid("123456")).toBe("gid://shopify/Product/123456");
  });

  it("leaves an already-GID id untouched", () => {
    expect(normalizeProductGid("gid://shopify/Product/123456")).toBe(
      "gid://shopify/Product/123456",
    );
  });
});

describe("getStorefrontConfig — widget appears only for configured products", () => {
  it("is not configured for a shop that doesn't exist", async () => {
    const result = await getStorefrontConfig("unknown-shop.myshopify.com", "1");
    expect(result.configured).toBe(false);
  });

  it("is not configured for a product with no assignment", async () => {
    const shop = await makeShop();
    const result = await getStorefrontConfig(shop.domain, "999");
    expect(result.configured).toBe(false);
  });

  it("is not configured when the assignment is disabled", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shop.id, template.id, ["gid://shopify/Product/1"]);
    const assignment = await prisma.productAssignment.findFirstOrThrow({
      where: { shopId: shop.id },
    });
    await setAssignmentEnabled(shop.id, assignment.id, false);

    const result = await getStorefrontConfig(shop.domain, "1");
    expect(result.configured).toBe(false);
  });

  it("is not configured when the template has been archived", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shop.id, template.id, ["gid://shopify/Product/1"]);
    await prisma.personalizationTemplate.update({
      where: { id: template.id },
      data: { status: "ARCHIVED" },
    });

    const result = await getStorefrontConfig(shop.domain, "1");
    expect(result.configured).toBe(false);
  });

  it("is configured for an enabled assignment, and only for that product", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shop.id, template.id, ["gid://shopify/Product/1"]);

    const configured = await getStorefrontConfig(shop.domain, "1");
    expect(configured.configured).toBe(true);
    if (configured.configured) {
      expect(configured.template.confirmationRequired).toBe(true);
      expect(configured.template.fields).toHaveLength(1);
      expect(configured.zone).toBeNull();
    }

    const otherProduct = await getStorefrontConfig(shop.domain, "2");
    expect(otherProduct.configured).toBe(false);
  });

  it("includes the preview zone once one has been placed", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shop.id, template.id, ["gid://shopify/Product/1"]);
    await upsertPreviewZone(shop.id, template.id, {
      shopifyProductId: "gid://shopify/Product/1",
      imageUrl: "https://cdn.shopify.com/1.png",
      x: 0.4,
      y: 0.4,
      width: 0.2,
      height: 0.1,
      rotation: 0,
      alignment: "CENTER",
      textAlign: "CENTER",
      minFontSize: 10,
      maxFontSize: 30,
      defaultFontSize: 18,
      autoFit: true,
      opacity: 1,
      effect: null,
    });

    const result = await getStorefrontConfig(shop.domain, "1");
    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.zone).not.toBeNull();
      expect(result.zone?.imageUrl).toBe("https://cdn.shopify.com/1.png");
    }
  });

  it("scopes strictly to the requesting shop even if another shop has the same product id assigned", async () => {
    const shopA = await makeShop();
    const shopB = await makeShop();
    const templateA = await createTemplate(shopA.id, "STANDARD_TEXT", baseRules);
    await assignProducts(shopA.id, templateA.id, ["1"]);

    const resultForShopB = await getStorefrontConfig(shopB.domain, "1");
    expect(resultForShopB.configured).toBe(false);
  });
});
