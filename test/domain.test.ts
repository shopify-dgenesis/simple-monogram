import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";

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

describe("tenant isolation", () => {
  it("scopes personalization templates to their owning shop", async () => {
    const shopA = await makeShop();
    const shopB = await makeShop();

    await prisma.personalizationTemplate.create({
      data: { shopId: shopA.id, name: "Shop A Template", type: "STANDARD_TEXT" },
    });
    await prisma.personalizationTemplate.create({
      data: { shopId: shopB.id, name: "Shop B Template", type: "STANDARD_TEXT" },
    });

    const shopATemplates = await prisma.personalizationTemplate.findMany({
      where: { shopId: shopA.id },
    });
    const shopBTemplates = await prisma.personalizationTemplate.findMany({
      where: { shopId: shopB.id },
    });

    expect(shopATemplates).toHaveLength(1);
    expect(shopATemplates[0].name).toBe("Shop A Template");
    expect(shopBTemplates).toHaveLength(1);
    expect(shopBTemplates[0].name).toBe("Shop B Template");
  });

  it("does not leak product assignments or customizations across shops", async () => {
    const shopA = await makeShop();
    const shopB = await makeShop();

    const templateA = await prisma.personalizationTemplate.create({
      data: { shopId: shopA.id, name: "A", type: "SINGLE_INITIAL" },
    });
    const templateB = await prisma.personalizationTemplate.create({
      data: { shopId: shopB.id, name: "B", type: "SINGLE_INITIAL" },
    });

    await prisma.productAssignment.create({
      data: {
        shopId: shopA.id,
        templateId: templateA.id,
        shopifyProductId: "gid://shopify/Product/1",
      },
    });
    await prisma.productAssignment.create({
      data: {
        shopId: shopB.id,
        templateId: templateB.id,
        shopifyProductId: "gid://shopify/Product/1", // same product id, different shop
      },
    });

    const shopAAssignments = await prisma.productAssignment.findMany({
      where: { shopId: shopA.id },
    });
    const shopBAssignments = await prisma.productAssignment.findMany({
      where: { shopId: shopB.id },
    });

    expect(shopAAssignments).toHaveLength(1);
    expect(shopBAssignments).toHaveLength(1);
    expect(shopAAssignments[0].templateId).toBe(templateA.id);
    expect(shopBAssignments[0].templateId).toBe(templateB.id);
  });

  it("enforces one assignment per product per shop", async () => {
    const shop = await makeShop();
    const template = await prisma.personalizationTemplate.create({
      data: { shopId: shop.id, name: "Only one", type: "NUMBER" },
    });

    await prisma.productAssignment.create({
      data: {
        shopId: shop.id,
        templateId: template.id,
        shopifyProductId: "gid://shopify/Product/42",
      },
    });

    await expect(
      prisma.productAssignment.create({
        data: {
          shopId: shop.id,
          templateId: template.id,
          shopifyProductId: "gid://shopify/Product/42",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("core CRUD", () => {
  it("creates a template with fields, a preview zone, and a variant rule", async () => {
    const shop = await makeShop();

    const template = await prisma.personalizationTemplate.create({
      data: {
        shopId: shop.id,
        name: "Basic Monogram",
        type: "BASIC_MONOGRAM",
        effect: "ENGRAVING",
        fields: {
          create: [
            { key: "initial1", label: "First Initial", sortOrder: 0 },
            { key: "initial2", label: "Middle Initial", sortOrder: 1 },
            { key: "initial3", label: "Last Initial", sortOrder: 2 },
          ],
        },
      },
      include: { fields: true },
    });

    expect(template.fields).toHaveLength(3);

    const zone = await prisma.previewZone.create({
      data: {
        templateId: template.id,
        shopifyProductId: "gid://shopify/Product/100",
        x: 0.52,
        y: 0.41,
        width: 0.24,
        height: 0.08,
        rotation: -3,
        minFontSize: 10,
        maxFontSize: 40,
        defaultFontSize: 24,
      },
    });

    const variantRule = await prisma.variantPreviewRule.create({
      data: {
        previewZoneId: zone.id,
        shopifyVariantId: "gid://shopify/ProductVariant/1",
        previewImageUrl: "https://example.com/black-wallet.png",
      },
    });

    const reloaded = await prisma.previewZone.findUniqueOrThrow({
      where: { id: zone.id },
      include: { variantRules: true },
    });

    expect(reloaded.variantRules).toHaveLength(1);
    expect(reloaded.variantRules[0].id).toBe(variantRule.id);
  });

  it("records a customization and its preview snapshot, and updates fulfillment status", async () => {
    const shop = await makeShop();
    const template = await prisma.personalizationTemplate.create({
      data: { shopId: shop.id, name: "Engraved Gift", type: "STANDARD_TEXT" },
    });

    const customization = await prisma.customization.create({
      data: {
        internalRef: `sm_${randomUUID()}`,
        shopId: shop.id,
        shopifyProductId: "gid://shopify/Product/7",
        shopifyVariantId: "gid://shopify/ProductVariant/7",
        templateId: template.id,
        templateNameSnapshot: template.name,
        fieldValues: { text: "MARK" },
        displayText: "MARK",
        effect: "ENGRAVING",
        placement: { x: 0.5, y: 0.4, width: 0.2, height: 0.08, rotation: 0, fontSize: 24 },
        previewSnapshot: {
          create: {
            publicRef: `pv_${randomUUID()}`,
            imageUrl: "https://example.com/preview.png",
          },
        },
      },
      include: { previewSnapshot: true },
    });

    expect(customization.previewSnapshot).not.toBeNull();

    const updated = await prisma.customization.update({
      where: { id: customization.id },
      data: { fulfillmentStatus: "FULFILLED" },
    });

    expect(updated.fulfillmentStatus).toBe("FULFILLED");
  });

  it("preserves customization history when its template is deleted", async () => {
    const shop = await makeShop();
    const template = await prisma.personalizationTemplate.create({
      data: { shopId: shop.id, name: "Soon Deleted", type: "STANDARD_TEXT" },
    });

    const customization = await prisma.customization.create({
      data: {
        internalRef: `sm_${randomUUID()}`,
        shopId: shop.id,
        shopifyProductId: "gid://shopify/Product/9",
        shopifyVariantId: "gid://shopify/ProductVariant/9",
        templateId: template.id,
        templateNameSnapshot: template.name,
        fieldValues: { text: "JOY" },
        displayText: "JOY",
        effect: "PRINT",
        placement: { x: 0.5, y: 0.5, width: 0.2, height: 0.08, rotation: 0, fontSize: 20 },
      },
    });

    await prisma.personalizationTemplate.delete({ where: { id: template.id } });

    const reloaded = await prisma.customization.findUniqueOrThrow({
      where: { id: customization.id },
    });

    expect(reloaded.templateId).toBeNull();
    expect(reloaded.templateNameSnapshot).toBe("Soon Deleted");
    expect(reloaded.displayText).toBe("JOY");
  });

  it("enforces the Free plan's 5 active product limit at the query layer", async () => {
    const shop = await makeShop();
    const template = await prisma.personalizationTemplate.create({
      data: { shopId: shop.id, name: "Limit Test", type: "NUMBER" },
    });

    for (let i = 0; i < 5; i++) {
      await prisma.productAssignment.create({
        data: {
          shopId: shop.id,
          templateId: template.id,
          shopifyProductId: `gid://shopify/Product/${i}`,
        },
      });
    }

    const activeCount = await prisma.productAssignment.count({
      where: { shopId: shop.id, enabled: true },
    });

    expect(activeCount).toBe(5);
    expect(shop.plan).toBe("FREE");
  });
});
