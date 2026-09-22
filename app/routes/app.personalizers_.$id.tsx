import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { data, redirect, useLoaderData, useActionData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import {
  deleteTemplate,
  duplicateTemplate,
  setTemplateStatus,
  updateTemplate,
} from "../models/template.server";
import { parseTemplateForm } from "../lib/template-form.server";
import { TemplateForm, type TemplateFormValues } from "../components/TemplateForm";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const template = await db.personalizationTemplate.findUnique({
    where: { id: params.id, shopId: shop.id },
    include: {
      fields: true,
      allowedFonts: { select: { id: true } },
      allowedColorPalettes: { select: { id: true } },
      _count: { select: { productAssignments: true, previewZones: true } },
    },
  });

  if (!template) {
    throw new Response("Personalizer not found", { status: 404 });
  }

  const [fonts, palettes] = await Promise.all([
    db.font.findMany({
      where: { OR: [{ shopId: shop.id }, { shopId: null, isSystem: true }] },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.colorPalette.findMany({
      where: { OR: [{ shopId: shop.id }, { shopId: null, isSystem: true }] },
      orderBy: { name: "asc" },
    }),
  ]);

  return { template, fonts, palettes };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const templateId = params.id!;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "duplicate") {
    const copy = await duplicateTemplate(shop.id, templateId);
    return redirect(`/app/personalizers/${copy.id}?duplicated=1`);
  }

  if (intent === "archive") {
    await setTemplateStatus(shop.id, templateId, "ARCHIVED");
    return redirect(`/app/personalizers/${templateId}?archived=1`);
  }

  if (intent === "activate") {
    await setTemplateStatus(shop.id, templateId, "ACTIVE");
    return redirect(`/app/personalizers/${templateId}?activated=1`);
  }

  if (intent === "delete") {
    await deleteTemplate(shop.id, templateId);
    return redirect("/app/personalizers?deleted=1");
  }

  const { values, errors } = parseTemplateForm(formData);
  if (Object.keys(errors).length > 0) {
    return data({ errors, values }, { status: 400 });
  }

  await updateTemplate(shop.id, templateId, values);
  return redirect(`/app/personalizers/${templateId}?saved=1`);
};

export default function EditPersonalizer() {
  const { template, fonts, palettes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const shopify = useAppBridge();

  useEffect(() => {
    if (searchParams.get("created")) shopify.toast.show("Personalizer created");
    if (searchParams.get("saved")) shopify.toast.show("Changes saved");
    if (searchParams.get("duplicated")) shopify.toast.show("Personalizer duplicated");
    if (searchParams.get("archived")) shopify.toast.show("Personalizer archived");
    if (searchParams.get("activated")) shopify.toast.show("Personalizer activated");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const firstField = template.fields[0];

  const values: TemplateFormValues = {
    name: actionData?.values.name ?? template.name,
    type: template.type,
    effect: actionData?.values.effect ?? template.effect,
    confirmationRequired: actionData?.values.confirmationRequired ?? template.confirmationRequired,
    required: actionData?.values.required ?? firstField?.required ?? true,
    minLength: actionData?.values.minLength ?? firstField?.minLength ?? null,
    maxLength: actionData?.values.maxLength ?? firstField?.maxLength ?? null,
    allowedCharacters:
      actionData?.values.allowedCharacters ?? firstField?.allowedCharacters ?? "LETTERS_AND_NUMBERS",
    customAllowedPattern:
      actionData?.values.customAllowedPattern ?? firstField?.customAllowedPattern ?? null,
    transform: actionData?.values.transform ?? firstField?.transform ?? "NONE",
    cleanSpacing: actionData?.values.cleanSpacing ?? firstField?.disallowLeadingSpaces ?? true,
    disableEmoji: actionData?.values.disableEmoji ?? firstField?.disableEmoji ?? true,
    defaultFontId: actionData?.values.defaultFontId ?? template.defaultFontId,
    allowedFontIds:
      actionData?.values.allowedFontIds ?? template.allowedFonts.map((f) => f.id),
    allowedColorPaletteIds:
      actionData?.values.allowedColorPaletteIds ??
      template.allowedColorPalettes.map((p) => p.id),
  };

  return (
    <s-page heading={template.name}>
      <s-link slot="breadcrumb-actions" href="/app/personalizers">
        Personalizers
      </s-link>

      <s-section heading={`${template._count.productAssignments} product(s) assigned`}>
        <TemplateForm
          mode="edit"
          values={values}
          fonts={fonts}
          palettes={palettes}
          errors={actionData?.errors}
        />
      </s-section>

      <s-section heading="Placement" slot="aside">
        <s-paragraph>
          {template._count.previewZones === 0
            ? "No products have a placement zone yet."
            : `${template._count.previewZones} product(s) have a placement zone.`}
        </s-paragraph>
        <s-link href={`/app/personalizers/${template.id}/studio`}>
          Open placement studio
        </s-link>
      </s-section>

      <s-section heading="Manage" slot="aside">
        <form method="post">
          <input type="hidden" name="intent" value="duplicate" />
          <s-button type="submit" variant="secondary">
            Duplicate
          </s-button>
        </form>

        <form method="post">
          <input
            type="hidden"
            name="intent"
            value={template.status === "ACTIVE" ? "archive" : "activate"}
          />
          <s-button type="submit" variant="secondary">
            {template.status === "ACTIVE" ? "Archive" : "Activate"}
          </s-button>
        </form>

        <form
          method="post"
          onSubmit={(event) => {
            if (!confirm("Delete this personalizer? This can't be undone.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <s-button type="submit" tone="critical" variant="secondary">
            Delete
          </s-button>
        </form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
