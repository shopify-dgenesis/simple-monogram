import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupShop, createTestShop, prisma } from "./db";
import {
  createTemplate,
  duplicateTemplate,
  deleteTemplate,
  setTemplateStatus,
  updateTemplate,
  type TemplateRuleInput,
} from "../app/models/template.server";
import { PERSONALIZATION_TYPE_OPTIONS } from "../app/lib/personalization-types";

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
  name: "Gold Jewelry Engraving",
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

describe("template.server", () => {
  it("generates the correct field set for every personalization type", async () => {
    const shop = await makeShop();

    for (const option of PERSONALIZATION_TYPE_OPTIONS) {
      const template = await createTemplate(shop.id, option.value, {
        ...baseRules,
        name: option.label,
      });

      expect(template.fields).toHaveLength(option.fields.length);
      expect(template.fields.map((f) => f.key).sort()).toEqual(
        option.fields.map((f) => f.key).sort(),
      );
      for (const field of template.fields) {
        expect(field.allowedCharacters).toBe("LETTERS_ONLY");
        expect(field.transform).toBe("UPPERCASE");
        expect(field.maxLength).toBe(10);
      }
    }
  });

  it("persists updates, including font/color relation changes, across reloads", async () => {
    const shop = await makeShop();
    const font = await prisma.font.create({
      data: { name: "Test Serif", category: "SERIF", family: "serif", isSystem: true },
    });
    const palette = await prisma.colorPalette.create({
      data: { name: "Test Palette", isSystem: true },
    });

    const created = await createTemplate(shop.id, "STANDARD_TEXT", {
      ...baseRules,
      defaultFontId: null,
      allowedFontIds: [],
      allowedColorPaletteIds: [],
    });

    await updateTemplate(shop.id, created.id, {
      ...baseRules,
      name: "Renamed Template",
      effect: "FOIL",
      maxLength: 20,
      defaultFontId: font.id,
      allowedFontIds: [font.id],
      allowedColorPaletteIds: [palette.id],
    });

    const reloaded = await prisma.personalizationTemplate.findUniqueOrThrow({
      where: { id: created.id },
      include: { fields: true, allowedFonts: true, allowedColorPalettes: true },
    });

    expect(reloaded.name).toBe("Renamed Template");
    expect(reloaded.effect).toBe("FOIL");
    expect(reloaded.defaultFontId).toBe(font.id);
    expect(reloaded.allowedFonts.map((f) => f.id)).toEqual([font.id]);
    expect(reloaded.allowedColorPalettes.map((p) => p.id)).toEqual([palette.id]);
    expect(reloaded.fields[0].maxLength).toBe(20);

    // removing the relation should clear it, not just leave it unset
    await updateTemplate(shop.id, created.id, {
      ...baseRules,
      allowedFontIds: [],
      allowedColorPaletteIds: [],
    });
    const cleared = await prisma.personalizationTemplate.findUniqueOrThrow({
      where: { id: created.id },
      include: { allowedFonts: true, allowedColorPalettes: true },
    });
    expect(cleared.allowedFonts).toHaveLength(0);
    expect(cleared.allowedColorPalettes).toHaveLength(0);
  });

  it("duplicates a template with its fields and relations, under a new id", async () => {
    const shop = await makeShop();
    const font = await prisma.font.create({
      data: { name: "Dup Font", category: "SCRIPT", family: "cursive", isSystem: true },
    });

    const original = await createTemplate(shop.id, "TWO_INITIALS", {
      ...baseRules,
      allowedFontIds: [font.id],
    });

    const copy = await duplicateTemplate(shop.id, original.id);

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe(`${original.name} (copy)`);

    const copyWithRelations = await prisma.personalizationTemplate.findUniqueOrThrow({
      where: { id: copy.id },
      include: { fields: true, allowedFonts: true },
    });

    expect(copyWithRelations.fields).toHaveLength(2);
    expect(copyWithRelations.allowedFonts.map((f) => f.id)).toEqual([font.id]);
  });

  it("archives, reactivates, and deletes a template", async () => {
    const shop = await makeShop();
    const template = await createTemplate(shop.id, "NUMBER", baseRules);

    await setTemplateStatus(shop.id, template.id, "ARCHIVED");
    let reloaded = await prisma.personalizationTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(reloaded.status).toBe("ARCHIVED");

    await setTemplateStatus(shop.id, template.id, "ACTIVE");
    reloaded = await prisma.personalizationTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(reloaded.status).toBe("ACTIVE");

    await deleteTemplate(shop.id, template.id);
    const afterDelete = await prisma.personalizationTemplate.findUnique({
      where: { id: template.id },
    });
    expect(afterDelete).toBeNull();
  });

  it("scopes updates to the owning shop", async () => {
    const shopA = await makeShop();
    const shopB = await makeShop();
    const template = await createTemplate(shopA.id, "STANDARD_TEXT", baseRules);

    await expect(
      updateTemplate(shopB.id, template.id, { ...baseRules, name: "Hijacked" }),
    ).rejects.toThrow();
  });
});
