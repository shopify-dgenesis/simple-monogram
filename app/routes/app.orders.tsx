import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const customizations = await db.customization.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { customizations };
};

export default function Orders() {
  const { customizations } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Orders">
      <s-section>
        {customizations.length === 0 ? (
          <s-empty-state heading="No personalized orders yet">
            <s-paragraph slot="subheading">
              Once customers personalize and purchase products, their
              customizations and preview proofs will appear here for
              fulfillment.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Order</s-table-header>
              <s-table-header>Product</s-table-header>
              <s-table-header>Personalization</s-table-header>
              <s-table-header>Confirmed</s-table-header>
              <s-table-header>Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {customizations.map((customization) => (
                <s-table-row key={customization.id}>
                  <s-table-cell>
                    {customization.shopifyOrderName ?? "—"}
                  </s-table-cell>
                  <s-table-cell>{customization.shopifyProductId}</s-table-cell>
                  <s-table-cell>{customization.displayText}</s-table-cell>
                  <s-table-cell>
                    {customization.confirmed ? "Yes" : "No"}
                  </s-table-cell>
                  <s-table-cell>{customization.fulfillmentStatus}</s-table-cell>
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
