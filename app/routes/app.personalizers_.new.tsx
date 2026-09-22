import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { data, redirect, useLoaderData, useActionData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { createTemplate } from "../models/template.server";
import { parseTemplateForm } from "../lib/template-form.server";
import { PERSONALIZATION_TYPE_OPTIONS } from "../lib/personalization-types";
import { TemplateForm, type TemplateFormValues } from "../components/TemplateForm";
import db from "../db.server";
import type { PersonalizationType } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

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

  return { fonts, palettes };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();
  const { values, errors } = parseTemplateForm(formData);

  const typeRaw = formData.get("type") as string | null;
  const validType = PERSONALIZATION_TYPE_OPTIONS.find((o) => o.value === typeRaw);
  if (!validType) {
    errors.type = "Choose a personalization type";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors, values, type: typeRaw }, { status: 400 });
  }

  const template = await createTemplate(shop.id, validType!.value, values);

  return redirect(`/app/personalizers/${template.id}?created=1`);
};

export default function NewPersonalizer() {
  const { fonts, palettes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const values: TemplateFormValues = {
    name: actionData?.values.name ?? "",
    type: (actionData?.type as PersonalizationType) ?? "STANDARD_TEXT",
    effect: actionData?.values.effect ?? "PRINT",
    confirmationRequired: actionData?.values.confirmationRequired ?? false,
    required: actionData?.values.required ?? true,
    minLength: actionData?.values.minLength ?? null,
    maxLength: actionData?.values.maxLength ?? null,
    allowedCharacters: actionData?.values.allowedCharacters ?? "LETTERS_AND_NUMBERS",
    customAllowedPattern: actionData?.values.customAllowedPattern ?? null,
    transform: actionData?.values.transform ?? "NONE",
    cleanSpacing: actionData?.values.cleanSpacing ?? true,
    disableEmoji: actionData?.values.disableEmoji ?? true,
    defaultFontId: actionData?.values.defaultFontId ?? null,
    allowedFontIds: actionData?.values.allowedFontIds ?? [],
    allowedColorPaletteIds: actionData?.values.allowedColorPaletteIds ?? [],
  };

  return (
    <s-page heading="New personalizer">
      <s-link slot="breadcrumb-actions" href="/app/personalizers">
        Personalizers
      </s-link>
      <TemplateForm
        mode="create"
        values={values}
        fonts={fonts}
        palettes={palettes}
        errors={actionData?.errors}
      />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
