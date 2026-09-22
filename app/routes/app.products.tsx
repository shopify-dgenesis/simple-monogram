import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const assignments = await db.productAssignment.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true } } },
  });

  const activeCount = assignments.filter((a) => a.enabled).length;
  const limit = shop.plan === "FREE" ? 5 : null;

  return { assignments, activeCount, limit, plan: shop.plan };
};

export default function Products() {
  const { assignments, activeCount, limit, plan } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Products">
      {limit !== null && (
        <s-section slot="aside" heading="Free plan limit">
          <s-paragraph>
            {activeCount} of {limit} personalized products used on the{" "}
            {plan} plan.
          </s-paragraph>
        </s-section>
      )}

      <s-section>
        {assignments.length === 0 ? (
          <s-empty-state heading="No products assigned yet">
            <s-paragraph slot="subheading">
              Once you&apos;ve created a personalizer, assign it to products
              here so customers can personalize them on the storefront.
              Assignment is coming in a later build phase.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Personalizer</s-table-header>
              <s-table-header>Source</s-table-header>
              <s-table-header>Enabled</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {assignments.map((assignment) => (
                <s-table-row key={assignment.id}>
                  <s-table-cell>{assignment.shopifyProductId}</s-table-cell>
                  <s-table-cell>{assignment.template.name}</s-table-cell>
                  <s-table-cell>{assignment.assignmentSource}</s-table-cell>
                  <s-table-cell>{assignment.enabled ? "Yes" : "No"}</s-table-cell>
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
