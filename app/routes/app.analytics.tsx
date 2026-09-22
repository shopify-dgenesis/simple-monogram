import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const eventCounts = await db.analyticsEvent.groupBy({
    by: ["type"],
    where: { shopId: shop.id },
    _count: true,
  });

  return { eventCounts };
};

export default function Analytics() {
  const { eventCounts } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      <s-section>
        {eventCounts.length === 0 ? (
          <s-empty-state heading="No analytics yet">
            <s-paragraph slot="subheading">
              Once customers start viewing and personalizing products,
              engagement data will appear here.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Event</s-table-header>
              <s-table-header>Count</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {eventCounts.map((row) => (
                <s-table-row key={row.type}>
                  <s-table-cell>{row.type}</s-table-cell>
                  <s-table-cell>{row._count}</s-table-cell>
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
