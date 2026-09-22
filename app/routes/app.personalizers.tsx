import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const templates = await db.personalizationTemplate.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { productAssignments: true } } },
  });

  return { templates };
};

export default function Personalizers() {
  const { templates } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Personalizers">
      <s-section>
        {templates.length === 0 ? (
          <s-empty-state heading="No personalizers yet">
            <s-paragraph slot="subheading">
              Personalizers let you define what customers can customize —
              text, initials, monograms, numbers — along with fonts, colors,
              and rules. Creating one is coming in the next build phase.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Name</s-table-header>
              <s-table-header>Type</s-table-header>
              <s-table-header>Effect</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Products</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {templates.map((template) => (
                <s-table-row key={template.id}>
                  <s-table-cell>{template.name}</s-table-cell>
                  <s-table-cell>{template.type}</s-table-cell>
                  <s-table-cell>{template.effect}</s-table-cell>
                  <s-table-cell>{template.status}</s-table-cell>
                  <s-table-cell>{template._count.productAssignments}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
