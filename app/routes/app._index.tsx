import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [templateCount, activeProductCount, orderCount, customizationsThisMonth] =
    await Promise.all([
      db.personalizationTemplate.count({
        where: { shopId: shop.id, status: "ACTIVE" },
      }),
      db.productAssignment.count({
        where: { shopId: shop.id, enabled: true },
      }),
      db.customization.count({
        where: { shopId: shop.id, shopifyOrderId: { not: null } },
      }),
      db.customization.count({
        where: { shopId: shop.id, createdAt: { gte: startOfMonth } },
      }),
    ]);

  return {
    plan: shop.plan,
    templateCount,
    activeProductCount,
    orderCount,
    customizationsThisMonth,
  };
};

export default function Dashboard() {
  const { plan, templateCount, activeProductCount, orderCount, customizationsThisMonth } =
    useLoaderData<typeof loader>();

  const hasTemplate = templateCount > 0;
  const hasAssignment = activeProductCount > 0;

  return (
    <s-page heading="Dashboard">
      <s-section heading="Get started">
        <s-unordered-list>
          <s-list-item>
            {hasTemplate ? "✅" : "☐"} Create your first personalizer —{" "}
            <s-link href="/app/personalizers">Personalizers</s-link>
          </s-list-item>
          <s-list-item>
            {hasAssignment ? "✅" : "☐"} Assign it to a product —{" "}
            <s-link href="/app/products">Products</s-link>
          </s-list-item>
          <s-list-item>
            ☐ Add the Simple Monogram block to your theme (Theme Editor)
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <s-text color="subdued">Personalizable products</s-text>
              <s-heading>{activeProductCount}</s-heading>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <s-text color="subdued">Personalized orders</s-text>
              <s-heading>{orderCount}</s-heading>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <s-text color="subdued">Customizations this month</s-text>
              <s-heading>{customizationsThisMonth}</s-heading>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Plan">
        <s-paragraph>
          You&apos;re on the <s-text fontWeight="bold">{plan}</s-text> plan.
        </s-paragraph>
        <s-link href="/app/plan">Manage plan</s-link>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
