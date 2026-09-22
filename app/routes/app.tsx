import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    plan: shop.plan,
  };
};

export default function App() {
  const { apiKey, plan } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/personalizers">Personalizers</s-link>
        <s-link href="/app/products">Products</s-link>
        <s-link href="/app/orders">Orders</s-link>
        <s-link href="/app/fonts-and-colors">Fonts &amp; Colors</s-link>
        <s-link href="/app/widget-design">Widget Design</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/plan">
          Plan <s-badge tone={plan === "PRO" ? "success" : "neutral"}>{plan}</s-badge>
        </s-link>
      </s-app-nav>
      {isNavigating && (
        <div
          role="status"
          aria-label="Loading"
          style={{ display: "flex", justifyContent: "center", padding: "8px" }}
        >
          <s-spinner accessibilityLabel="Loading" size="base" />
        </div>
      )}
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
