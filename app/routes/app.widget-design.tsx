import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const settings = await db.appSettings.findUniqueOrThrow({
    where: { shopId: shop.id },
  });

  return { settings };
};

export default function WidgetDesign() {
  const { settings } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Widget Design">
      <s-section heading="Storefront appearance">
        <s-paragraph>
          {settings.useThemeStyling
            ? "Use theme styling is on — the widget inherits your theme's fonts, colors, and button styles."
            : "Use theme styling is off — the widget uses Simple Monogram's default styles."}
        </s-paragraph>
        <s-paragraph>
          {settings.brandingEnabled
            ? "Simple Monogram branding is shown in the widget."
            : "Simple Monogram branding is hidden."}
        </s-paragraph>
        <s-banner tone="info">
          <s-paragraph>
            Full widget customization (heading, labels, colors, spacing) is
            configured once the storefront widget is built in a later build
            phase.
          </s-paragraph>
        </s-banner>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
