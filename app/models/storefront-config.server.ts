import db from "../db.server";

export function normalizeProductGid(rawId: string): string {
  return /^\d+$/.test(rawId) ? `gid://shopify/Product/${rawId}` : rawId;
}

export type StorefrontConfigResult =
  | { configured: false }
  | {
      configured: true;
      template: {
        id: string;
        type: string;
        effect: string;
        confirmationRequired: boolean;
        defaultFontId: string | null;
        fields: {
          key: string;
          label: string;
          inputType: string;
          required: boolean;
          minLength: number | null;
          maxLength: number | null;
          allowedCharacters: string;
          customAllowedPattern: string | null;
          transform: string;
          disallowLeadingSpaces: boolean;
          disallowTrailingSpaces: boolean;
          collapseDuplicateSpaces: boolean;
          disableEmoji: boolean;
        }[];
        fonts: { id: string; name: string; family: string }[];
        colors: { id: string; name: string; hex: string }[];
      };
      zone: {
        imageUrl: string | null;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        alignment: string;
        textAlign: string;
        minFontSize: number;
        maxFontSize: number;
        defaultFontSize: number;
        autoFit: boolean;
        opacity: number;
        effect: string | null;
        variantRules: {
          shopifyVariantId: string;
          previewImageUrl: string | null;
          allowedColorIds: string[];
        }[];
      } | null;
    };

export async function getStorefrontConfig(
  shopDomain: string,
  rawProductId: string,
): Promise<StorefrontConfigResult> {
  const shopifyProductId = normalizeProductGid(rawProductId);

  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) return { configured: false };

  const assignment = await db.productAssignment.findUnique({
    where: { shopId_shopifyProductId: { shopId: shop.id, shopifyProductId } },
    include: {
      template: {
        include: {
          fields: { orderBy: { sortOrder: "asc" } },
          allowedFonts: true,
          allowedColorPalettes: { include: { colors: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });

  if (!assignment || !assignment.enabled || assignment.template.status !== "ACTIVE") {
    return { configured: false };
  }

  const zone = await db.previewZone.findUnique({
    where: {
      templateId_shopifyProductId: {
        templateId: assignment.templateId,
        shopifyProductId,
      },
    },
    include: { variantRules: { include: { allowedColors: { select: { id: true } } } } },
  });

  const { template } = assignment;

  return {
    configured: true,
    template: {
      id: template.id,
      type: template.type,
      effect: template.effect,
      confirmationRequired: template.confirmationRequired,
      defaultFontId: template.defaultFontId,
      fields: template.fields.map((field) => ({
        key: field.key,
        label: field.label,
        inputType: field.inputType,
        required: field.required,
        minLength: field.minLength,
        maxLength: field.maxLength,
        allowedCharacters: field.allowedCharacters,
        customAllowedPattern: field.customAllowedPattern,
        transform: field.transform,
        disallowLeadingSpaces: field.disallowLeadingSpaces,
        disallowTrailingSpaces: field.disallowTrailingSpaces,
        collapseDuplicateSpaces: field.collapseDuplicateSpaces,
        disableEmoji: field.disableEmoji,
      })),
      fonts: template.allowedFonts.map((font) => ({
        id: font.id,
        name: font.name,
        family: font.family,
      })),
      colors: template.allowedColorPalettes.flatMap((palette) =>
        palette.colors.map((color) => ({
          id: color.id,
          name: color.name,
          hex: color.hex,
        })),
      ),
    },
    zone: zone
      ? {
          imageUrl: zone.imageUrl,
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          rotation: zone.rotation,
          alignment: zone.alignment,
          textAlign: zone.textAlign,
          minFontSize: zone.minFontSize,
          maxFontSize: zone.maxFontSize,
          defaultFontSize: zone.defaultFontSize,
          autoFit: zone.autoFit,
          opacity: zone.opacity,
          effect: zone.effect,
          variantRules: zone.variantRules.map((rule) => ({
            shopifyVariantId: rule.shopifyVariantId,
            previewImageUrl: rule.previewImageUrl,
            allowedColorIds: rule.allowedColors.map((c) => c.id),
          })),
        }
      : null,
  };
}
