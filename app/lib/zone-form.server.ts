import type { PersonalizationEffect, ZoneAlignment } from "@prisma/client";

export interface ZoneInput {
  shopifyProductId: string;
  imageUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alignment: ZoneAlignment;
  textAlign: ZoneAlignment;
  minFontSize: number;
  maxFontSize: number;
  defaultFontSize: number;
  autoFit: boolean;
  opacity: number;
  effect: PersonalizationEffect | null;
}

const ALIGNMENTS: ZoneAlignment[] = ["LEFT", "CENTER", "RIGHT"];
const EFFECTS: PersonalizationEffect[] = [
  "PRINT",
  "ENGRAVING",
  "EMBROIDERY",
  "FOIL",
  "DEBOSS",
  "EMBOSS",
];

function parseFloatField(
  formData: FormData,
  name: string,
  fallback: number,
): number {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function parseZoneForm(formData: FormData): {
  values: ZoneInput;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const shopifyProductId = (formData.get("shopifyProductId") as string | null) ?? "";
  if (!shopifyProductId) errors.shopifyProductId = "A product is required";

  const imageUrlRaw = formData.get("imageUrl") as string | null;
  const imageUrl = imageUrlRaw && imageUrlRaw.trim() !== "" ? imageUrlRaw : null;

  const width = clamp(parseFloatField(formData, "width", 0.2), 0.02, 1);
  const height = clamp(parseFloatField(formData, "height", 0.08), 0.02, 1);
  const x = clamp(parseFloatField(formData, "x", 0.4), 0, 1 - width);
  const y = clamp(parseFloatField(formData, "y", 0.46), 0, 1 - height);
  const rotation = clamp(parseFloatField(formData, "rotation", 0), -180, 180);

  const alignmentRaw = formData.get("alignment") as string | null;
  const alignment = (ALIGNMENTS.includes(alignmentRaw as ZoneAlignment)
    ? alignmentRaw
    : "CENTER") as ZoneAlignment;

  const textAlignRaw = formData.get("textAlign") as string | null;
  const textAlign = (ALIGNMENTS.includes(textAlignRaw as ZoneAlignment)
    ? textAlignRaw
    : "CENTER") as ZoneAlignment;

  const minFontSize = clamp(parseFloatField(formData, "minFontSize", 10), 1, 500);
  const maxFontSize = clamp(parseFloatField(formData, "maxFontSize", 40), 1, 500);
  if (maxFontSize < minFontSize) {
    errors.maxFontSize = "Maximum font size must be greater than or equal to minimum";
  }
  const defaultFontSize = clamp(
    parseFloatField(formData, "defaultFontSize", minFontSize),
    minFontSize,
    maxFontSize,
  );

  const autoFit = formData.get("autoFit") === "true";
  const opacity = clamp(parseFloatField(formData, "opacity", 1), 0, 1);

  const effectRaw = formData.get("effect") as string | null;
  const effect = EFFECTS.includes(effectRaw as PersonalizationEffect)
    ? (effectRaw as PersonalizationEffect)
    : null;

  return {
    values: {
      shopifyProductId,
      imageUrl,
      x,
      y,
      width,
      height,
      rotation,
      alignment,
      textAlign,
      minFontSize,
      maxFontSize,
      defaultFontSize,
      autoFit,
      opacity,
      effect,
    },
    errors,
  };
}
