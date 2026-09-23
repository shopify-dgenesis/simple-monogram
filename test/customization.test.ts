import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";
import { createTemplate } from "../app/models/template.server";
import type { TemplateRuleInput } from "../app/models/template.server";
import { assignProducts } from "../app/models/assignment.server";
import { upsertPreviewZone } from "../app/models/zone.server";
import {
  createCustomization,
  CustomizationValidationError,
} from "../app/models/customization.server";

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
  maxLength: 6,
  allowedCharacters: "LETTERS_ONLY",
  customAllowedPattern: null,
  transform: "UPPERCASE",
  cleanSpacing: true,
  disableEmoji: true,
  defaultFontId: null,
  allowedFontIds: [],
  allowedColorPaletteIds: [],
};

const placement = { x: 0.4, y: 0.4, width: 0.2, height: 0.1, rotation: 0, fontSize: 20 };

async function setUpAssignedProduct(shop: Awaited<ReturnType<typeof makeShop>>) {
  const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
  await assignProducts(shop.id, template.id, ["gid://shopify/Product/1"]);
  return template;
}

describe("createCustomization", () => {
  it("creates a customization with a unique internal ref and preview ref", async () => {
    const shop = await makeShop();
    await setUpAssignedProduct(shop);

    const result = await createCustomization(shop.domain, {
      shopifyProductId: "1",
      shopifyVariantId: "10",
      fieldValues: { text: "mark" },
      fontId: null,
      colorId: null,
      confirmed: true,
      placement,
    });

    expect(result.internalRef).toMatch(/^sm_/);
    expect(result.previewRef).toMatch(/^pv_/);
    expect(result.displayText).toBe("MARK"); // uppercase transform applied server-side too

    const stored = await prisma.customization.findUniqueOrThrow({
      where: { internalRef: result.internalRef },
      include: { previewSnapshot: true },
    });
    expect(stored.shopifyProductId).toBe("gid://shopify/Product/1");
    expect(stored.shopifyVariantId).toBe("gid://shopify/ProductVariant/10");
    expect(stored.confirmed).toBe(true);
    expect(stored.previewSnapshot?.publicRef).toBe(result.previewRef);
  });

  it("rejects when a required field is missing (server-side validation, not just client-side)", async () => {
    const shop = await makeShop();
    await setUpAssignedProduct(shop);

    await expect(
      createCustomization(shop.domain, {
        shopifyProductId: "1",
        shopifyVariantId: "10",
        fieldValues: { text: "" },
        fontId: null,
        colorId: null,
        confirmed: true,
        placement,
      }),
    ).rejects.toBeInstanceOf(CustomizationValidationError);

    const count = await prisma.customization.count({ where: { shopId: shop.id } });
    expect(count).toBe(0);
  });

  it("rejects text that violates the template's character rules even if the client didn't catch it", async () => {
    const shop = await makeShop();
    await setUpAssignedProduct(shop);

    await expect(
      createCustomization(shop.domain, {
        shopifyProductId: "1",
        shopifyVariantId: "10",
        fieldValues: { text: "MARK99" }, // letters-only field, contains digits
        fontId: null,
        colorId: null,
        confirmed: true,
        placement,
      }),
    ).rejects.toBeInstanceOf(CustomizationValidationError);
  });

  it("enforces the confirmation requirement server-side", async () => {
    const shop = await makeShop();
    await setUpAssignedProduct(shop);

    await expect(
      createCustomization(shop.domain, {
        shopifyProductId: "1",
        shopifyVariantId: "10",
        fieldValues: { text: "MARK" },
        fontId: null,
        colorId: null,
        confirmed: false,
        placement,
      }),
    ).rejects.toBeInstanceOf(CustomizationValidationError);
  });

  it("rejects a product that isn't configured for personalization", async () => {
    const shop = await makeShop();

    await expect(
      createCustomization(shop.domain, {
        shopifyProductId: "999",
        shopifyVariantId: "10",
        fieldValues: { text: "MARK" },
        fontId: null,
        colorId: null,
        confirmed: true,
        placement,
      }),
    ).rejects.toBeInstanceOf(CustomizationValidationError);
  });

  it("keeps two differently-personalized customizations for the same product as distinct records", async () => {
    const shop = await makeShop();
    await setUpAssignedProduct(shop);

    const first = await createCustomization(shop.domain, {
      shopifyProductId: "1",
      shopifyVariantId: "10",
      fieldValues: { text: "mark" },
      fontId: null,
      colorId: null,
      confirmed: true,
      placement,
    });
    const second = await createCustomization(shop.domain, {
      shopifyProductId: "1",
      shopifyVariantId: "10",
      fieldValues: { text: "jane" },
      fontId: null,
      colorId: null,
      confirmed: true,
      placement,
    });

    expect(first.internalRef).not.toBe(second.internalRef);
    expect(first.displayText).toBe("MARK");
    expect(second.displayText).toBe("JANE");

    const count = await prisma.customization.count({ where: { shopId: shop.id } });
    expect(count).toBe(2);
  });

  it("snapshots the placement zone's image into the preview snapshot when one exists", async () => {
    const shop = await makeShop();
    const template = await setUpAssignedProduct(shop);
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

    const result = await createCustomization(shop.domain, {
      shopifyProductId: "1",
      shopifyVariantId: "10",
      fieldValues: { text: "mark" },
      fontId: null,
      colorId: null,
      confirmed: true,
      placement,
    });

    const stored = await prisma.customization.findUniqueOrThrow({
      where: { internalRef: result.internalRef },
      include: { previewSnapshot: true },
    });
    expect(stored.previewSnapshot?.imageUrl).toBe("https://cdn.shopify.com/1.png");
  });
});
