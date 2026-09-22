import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  return { shop };
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Settings">
      <s-section heading="Shop">
        <s-stack direction="block" gap="small-300">
          <s-paragraph>
            <s-text color="subdued">Domain: </s-text>
            {shop.domain}
          </s-paragraph>
          <s-paragraph>
            <s-text color="subdued">Plan: </s-text>
            {shop.plan}
          </s-paragraph>
          <s-paragraph>
            <s-text color="subdued">Installed: </s-text>
            {new Date(shop.installedAt).toLocaleDateString()}
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
