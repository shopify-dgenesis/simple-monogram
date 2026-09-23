import { randomUUID } from "node:crypto";
import db from "../db.server";
import { normalizeGid, normalizeProductGid } from "./storefront-config.server";
import {
  composeDisplayText,
  normalizeFieldValue,
  validateFieldValue,
} from "../lib/field-validation.server";

function shortRef(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export interface CreateCustomizationInput {
  shopifyProductId: string;
  shopifyVariantId: string;
  fieldValues: Record<string, string>;
  fontId: string | null;
  colorId: string | null;
  confirmed: boolean;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fontSize: number;
  };
}

export class CustomizationValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Personalization failed validation");
    this.errors = errors;
  }
}

export async function createCustomization(shopDomain: string, input: CreateCustomizationInput) {
  const shopifyProductId = normalizeProductGid(input.shopifyProductId);
  const shopifyVariantId = normalizeGid(input.shopifyVariantId, "ProductVariant");

  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    throw new CustomizationValidationError({ _: "Shop not found" });
  }

  const assignment = await db.productAssignment.findUnique({
    where: { shopId_shopifyProductId: { shopId: shop.id, shopifyProductId } },
    include: {
      template: {
        include: {
          fields: { orderBy: { sortOrder: "asc" } },
          allowedFonts: true,
          allowedColorPalettes: { include: { colors: true } },
        },
      },
    },
  });

  if (!assignment || !assignment.enabled || assignment.template.status !== "ACTIVE") {
    throw new CustomizationValidationError({ _: "This product is not configured for personalization" });
  }

  const { template } = assignment;

  const errors: Record<string, string> = {};
  const normalizedValues: Record<string, string> = {};
  for (const field of template.fields) {
    const raw = input.fieldValues[field.key] ?? "";
    const error = validateFieldValue(raw, field);
    if (error) {
      errors[field.key] = error;
    } else {
      normalizedValues[field.key] = normalizeFieldValue(raw, field);
    }
  }

  if (template.confirmationRequired && !input.confirmed) {
    errors._confirmation = "Please confirm your personalization before adding to cart.";
  }

  if (Object.keys(errors).length > 0) {
    throw new CustomizationValidationError(errors);
  }

  const font = input.fontId ? template.allowedFonts.find((f) => f.id === input.fontId) : null;
  const allColors = template.allowedColorPalettes.flatMap((p) => p.colors);
  const color = input.colorId ? allColors.find((c) => c.id === input.colorId) : null;

  const displayText = composeDisplayText(
    template.type,
    normalizedValues,
    template.fields.map((f) => f.key),
  );

  const zone = await db.previewZone.findUnique({
    where: { templateId_shopifyProductId: { templateId: template.id, shopifyProductId } },
  });

  const customization = await db.customization.create({
    data: {
      internalRef: shortRef("sm"),
      shopId: shop.id,
      shopifyProductId,
      shopifyVariantId,
      templateId: template.id,
      templateNameSnapshot: template.name,
      fieldValues: normalizedValues,
      displayText,
      fontId: font?.id ?? null,
      fontNameSnapshot: font?.name ?? null,
      colorId: color?.id ?? null,
      colorNameSnapshot: color?.name ?? null,
      colorHexSnapshot: color?.hex ?? null,
      effect: zone?.effect ?? template.effect,
      placement: input.placement,
      confirmed: input.confirmed,
      previewSnapshot: {
        create: {
          publicRef: shortRef("pv"),
          imageUrl: zone?.imageUrl ?? "",
          productImageUrl: zone?.imageUrl ?? null,
        },
      },
    },
    include: { previewSnapshot: true },
  });

  return {
    internalRef: customization.internalRef,
    previewRef: customization.previewSnapshot!.publicRef,
    displayText,
    fontName: font?.name ?? null,
    colorName: color?.name ?? null,
    effect: zone?.effect ?? template.effect,
  };
}
