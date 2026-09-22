import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";
import { deletePreviewZone, upsertPreviewZone } from "../app/models/zone.server";
import { createTemplate } from "../app/models/template.server";
import type { TemplateRuleInput } from "../app/models/template.server";
import type { ZoneInput } from "../app/lib/zone-form.server";

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
  name: "Wallet Engraving",
  effect: "ENGRAVING",
  confirmationRequired: false,
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

const zoneInput: ZoneInput = {
  shopifyProductId: "gid://shopify/Product/100",
  imageUrl: "https://cdn.shopify.com/product-100.png",
  x: 0.5234567,
  y: 0.4123456,
  width: 0.2456789,
  height: 0.0812345,
  rotation: -3.25,
  alignment: "CENTER",
  textAlign: "CENTER",
  minFontSize: 10,
  maxFontSize: 40,
  defaultFontSize: 22.5,
  autoFit: true,
  opacity: 0.9,
  effect: "ENGRAVING",
};

describe("zone.server", () => {
  it("creates a preview zone scoped to the template's product", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    const zone = await upsertPreviewZone(shop.id, template.id, zoneInput);

    expect(zone.templateId).toBe(template.id);
    expect(zone.shopifyProductId).toBe(zoneInput.shopifyProductId);
  });

  it("does not introduce coordinate drift when reopening a saved zone", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    await upsertPreviewZone(shop.id, template.id, zoneInput);

    const reloaded = await prisma.previewZone.findUniqueOrThrow({
      where: {
        templateId_shopifyProductId: {
          templateId: template.id,
          shopifyProductId: zoneInput.shopifyProductId,
        },
      },
    });

    expect(reloaded.x).toBeCloseTo(zoneInput.x, 10);
    expect(reloaded.y).toBeCloseTo(zoneInput.y, 10);
    expect(reloaded.width).toBeCloseTo(zoneInput.width, 10);
    expect(reloaded.height).toBeCloseTo(zoneInput.height, 10);
    expect(reloaded.rotation).toBeCloseTo(zoneInput.rotation, 10);
    expect(reloaded.defaultFontSize).toBeCloseTo(zoneInput.defaultFontSize, 10);
    expect(reloaded.opacity).toBeCloseTo(zoneInput.opacity, 10);

    // Reopening again (a second read) must yield the identical values —
    // no cumulative drift from repeated load/save cycles.
    const reloadedAgain = await prisma.previewZone.findUniqueOrThrow({
      where: { id: reloaded.id },
    });
    expect(reloadedAgain.x).toBe(reloaded.x);
    expect(reloadedAgain.width).toBe(reloaded.width);
    expect(reloadedAgain.rotation).toBe(reloaded.rotation);
  });

  it("upserts in place on save for the same product (one zone per product)", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    const first = await upsertPreviewZone(shop.id, template.id, zoneInput);
    const second = await upsertPreviewZone(shop.id, template.id, {
      ...zoneInput,
      x: 0.1,
      rotation: 10,
    });

    expect(second.id).toBe(first.id);
    expect(second.x).toBeCloseTo(0.1, 10);
    expect(second.rotation).toBeCloseTo(10, 10);

    const count = await prisma.previewZone.count({ where: { templateId: template.id } });
    expect(count).toBe(1);
  });

  it("supports independent zones for different products on the same template", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);

    await upsertPreviewZone(shop.id, template.id, zoneInput);
    await upsertPreviewZone(shop.id, template.id, {
      ...zoneInput,
      shopifyProductId: "gid://shopify/Product/200",
      x: 0.1,
      y: 0.2,
    });

    const zones = await prisma.previewZone.findMany({ where: { templateId: template.id } });
    expect(zones).toHaveLength(2);
  });

  it("rejects saving a zone against a template owned by a different shop", async () => {
    const shopA = await makeShop();
    const shopB = await makeShop();
    const template = await createTemplate(shopA.id, "STANDARD_TEXT", baseRules);

    await expect(upsertPreviewZone(shopB.id, template.id, zoneInput)).rejects.toThrow();
  });

  it("deletes a zone scoped to the owning shop", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "STANDARD_TEXT", baseRules);
    const zone = await upsertPreviewZone(shop.id, template.id, zoneInput);

    await deletePreviewZone(shop.id, template.id, zone.id);

    const afterDelete = await prisma.previewZone.findUnique({ where: { id: zone.id } });
    expect(afterDelete).toBeNull();
  });
});
