import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const [subscription, activeProductCount] = await Promise.all([
    db.subscription.findUniqueOrThrow({ where: { shopId: shop.id } }),
    db.productAssignment.count({ where: { shopId: shop.id, enabled: true } }),
  ]);

  return { plan: shop.plan, subscription, activeProductCount };
};

export default function Plan() {
  const { plan, subscription, activeProductCount } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Plan">
      <s-section heading="Current plan">
        <s-stack direction="block" gap="small-300">
          <s-paragraph>
            <s-text fontWeight="bold">{plan}</s-text> — status:{" "}
            {subscription.status}
          </s-paragraph>
          <s-paragraph>
            {activeProductCount}{" "}
            {plan === "FREE" ? "of 5 personalized products used." : "personalized products (unlimited on Pro)."}
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Free">
        <s-unordered-list>
          <s-list-item>Up to 5 personalized products</s-list-item>
          <s-list-item>Unlimited personalized orders</s-list-item>
          <s-list-item>Core text personalization, fonts &amp; colors</s-list-item>
          <s-list-item>Simple Monogram branding</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Pro — $9/month">
        <s-unordered-list>
          <s-list-item>Unlimited personalized products</s-list-item>
          <s-list-item>Custom fonts &amp; reusable palettes</s-list-item>
          <s-list-item>Bulk assignment &amp; advanced placement</s-list-item>
          <s-list-item>Branding removal</s-list-item>
        </s-unordered-list>
        <s-banner tone="info">
          <s-paragraph>
            Upgrading is enabled once native Shopify billing is wired up in a
            later build phase.
          </s-paragraph>
        </s-banner>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
