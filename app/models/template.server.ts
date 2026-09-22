import type {
  AllowedCharacters,
  PersonalizationEffect,
  PersonalizationType,
  TextTransform,
} from "@prisma/client";
import db from "../db.server";
import { getPersonalizationTypeOption } from "../lib/personalization-types";

export interface TemplateRuleInput {
  name: string;
  effect: PersonalizationEffect;
  confirmationRequired: boolean;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  allowedCharacters: AllowedCharacters;
  customAllowedPattern: string | null;
  transform: TextTransform;
  cleanSpacing: boolean;
  disableEmoji: boolean;
  defaultFontId: string | null;
  allowedFontIds: string[];
  allowedColorPaletteIds: string[];
}

function fieldData(input: TemplateRuleInput) {
  return {
    required: input.required,
    minLength: input.minLength,
    maxLength: input.maxLength,
    allowedCharacters: input.allowedCharacters,
    customAllowedPattern:
      input.allowedCharacters === "CUSTOM" ? input.customAllowedPattern : null,
    transform: input.transform,
    disallowLeadingSpaces: input.cleanSpacing,
    disallowTrailingSpaces: input.cleanSpacing,
    collapseDuplicateSpaces: input.cleanSpacing,
    disableEmoji: input.disableEmoji,
  };
}

export async function createTemplate(
  shopId: string,
  type: PersonalizationType,
  input: TemplateRuleInput,
) {
  const typeOption = getPersonalizationTypeOption(type);
  const shared = fieldData(input);

  return db.personalizationTemplate.create({
    data: {
      shopId,
      name: input.name,
      type,
      effect: input.effect,
      confirmationRequired: input.confirmationRequired,
      defaultFontId: input.defaultFontId,
      allowedFonts: { connect: input.allowedFontIds.map((id) => ({ id })) },
      allowedColorPalettes: {
        connect: input.allowedColorPaletteIds.map((id) => ({ id })),
      },
      fields: {
        create: typeOption.fields.map((field, index) => ({
          key: field.key,
          label: field.label,
          inputType: field.inputType,
          sortOrder: index,
          ...shared,
        })),
      },
    },
    include: { fields: true },
  });
}

export async function updateTemplate(
  shopId: string,
  templateId: string,
  input: TemplateRuleInput,
) {
  const shared = fieldData(input);

  return db.$transaction(async (tx) => {
    const template = await tx.personalizationTemplate.update({
      where: { id: templateId, shopId },
      data: {
        name: input.name,
        effect: input.effect,
        confirmationRequired: input.confirmationRequired,
        defaultFontId: input.defaultFontId,
        allowedFonts: { set: input.allowedFontIds.map((id) => ({ id })) },
        allowedColorPalettes: {
          set: input.allowedColorPaletteIds.map((id) => ({ id })),
        },
      },
    });

    await tx.personalizationField.updateMany({
      where: { templateId },
      data: shared,
    });

    return template;
  });
}

export async function duplicateTemplate(shopId: string, templateId: string) {
  const original = await db.personalizationTemplate.findUniqueOrThrow({
    where: { id: templateId, shopId },
    include: {
      fields: true,
      allowedFonts: { select: { id: true } },
      allowedColorPalettes: { select: { id: true } },
    },
  });

  return db.personalizationTemplate.create({
    data: {
      shopId,
      name: `${original.name} (copy)`,
      type: original.type,
      effect: original.effect,
      confirmationRequired: original.confirmationRequired,
      defaultFontId: original.defaultFontId,
      allowedFonts: {
        connect: original.allowedFonts.map((f) => ({ id: f.id })),
      },
      allowedColorPalettes: {
        connect: original.allowedColorPalettes.map((p) => ({ id: p.id })),
      },
      fields: {
        create: original.fields.map((field) => ({
          key: field.key,
          label: field.label,
          inputType: field.inputType,
          sortOrder: field.sortOrder,
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
      },
    },
  });
}

export async function setTemplateStatus(
  shopId: string,
  templateId: string,
  status: "ACTIVE" | "ARCHIVED",
) {
  return db.personalizationTemplate.update({
    where: { id: templateId, shopId },
    data: { status },
  });
}

export async function renameTemplate(
  shopId: string,
  templateId: string,
  name: string,
) {
  return db.personalizationTemplate.update({
    where: { id: templateId, shopId },
    data: { name },
  });
}

export async function deleteTemplate(shopId: string, templateId: string) {
  return db.personalizationTemplate.delete({
    where: { id: templateId, shopId },
  });
}
