import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { upsertPreviewZone } from "../models/zone.server";
import { parseZoneForm } from "../lib/zone-form.server";
import { PlacementStudio } from "../components/PlacementStudio";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const template = await db.personalizationTemplate.findUnique({
    where: { id: params.id, shopId: shop.id },
    include: {
      previewZones: { orderBy: { createdAt: "desc" } },
      allowedFonts: true,
      allowedColorPalettes: { include: { colors: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  if (!template) {
    throw new Response("Personalizer not found", { status: 404 });
  }

  return { template };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const templateId = params.id!;

  const formData = await request.formData();
  const { values, errors } = parseZoneForm(formData);

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const zone = await upsertPreviewZone(shop.id, templateId, values);
  return { zone };
};

export default function Studio() {
  const { template } = useLoaderData<typeof loader>();

  return (
    <s-page heading={`Placement studio — ${template.name}`}>
      <s-link slot="breadcrumb-actions" href={`/app/personalizers/${template.id}`}>
        {template.name}
      </s-link>

      <s-section>
        <PlacementStudio
          templateEffect={template.effect}
          zones={template.previewZones}
          fonts={template.allowedFonts}
          palettes={template.allowedColorPalettes}
        />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
