import db from "../db.server";
import type { ZoneInput } from "../lib/zone-form.server";

export async function assertTemplateOwnership(shopId: string, templateId: string) {
  const template = await db.personalizationTemplate.findUnique({
    where: { id: templateId, shopId },
    select: { id: true },
  });
  if (!template) {
    throw new Response("Personalizer not found", { status: 404 });
  }
}

export async function upsertPreviewZone(
  shopId: string,
  templateId: string,
  input: ZoneInput,
) {
  await assertTemplateOwnership(shopId, templateId);

  const { shopifyProductId, ...rest } = input;

  return db.previewZone.upsert({
    where: {
      templateId_shopifyProductId: { templateId, shopifyProductId },
    },
    create: { templateId, shopifyProductId, ...rest },
    update: rest,
  });
}

export async function deletePreviewZone(
  shopId: string,
  templateId: string,
  zoneId: string,
) {
  await assertTemplateOwnership(shopId, templateId);

  return db.previewZone.delete({
    where: { id: zoneId, templateId },
  });
}
