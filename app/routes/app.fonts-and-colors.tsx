import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const [fonts, palettes] = await Promise.all([
    db.font.findMany({
      where: { OR: [{ shopId: shop.id }, { shopId: null, isSystem: true }] },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.colorPalette.findMany({
      where: { OR: [{ shopId: shop.id }, { shopId: null, isSystem: true }] },
      orderBy: { name: "asc" },
      include: { colors: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return { fonts, palettes };
};

export default function FontsAndColors() {
  const { fonts, palettes } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Fonts &amp; Colors">
      <s-section heading="Fonts">
        <s-table>
          <s-table-header-row>
            <s-table-header>Name</s-table-header>
            <s-table-header>Category</s-table-header>
            <s-table-header>Source</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {fonts.map((font) => (
              <s-table-row key={font.id}>
                <s-table-cell>{font.name}</s-table-cell>
                <s-table-cell>{font.category}</s-table-cell>
                <s-table-cell>{font.isSystem ? "Built-in" : "Custom"}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-section heading="Color palettes">
        {palettes.length === 0 ? (
          <s-empty-state heading="No color palettes yet">
            <s-paragraph slot="subheading">
              Reusable color palettes will appear here.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-stack direction="block" gap="base">
            {palettes.map((palette) => (
              <s-box key={palette.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="small-300">
                  <s-text fontWeight="bold">{palette.name}</s-text>
                  <s-stack direction="inline" gap="small-300">
                    {palette.colors.map((color) => (
                      <s-stack key={color.id} direction="inline" gap="small-400">
                        <div
                          aria-hidden="true"
                          style={{
                            width: "1rem",
                            height: "1rem",
                            borderRadius: "4px",
                            border: "1px solid rgba(0,0,0,0.15)",
                            background: color.hex,
                          }}
                        />
                        <s-text color="subdued">
                          {color.name} ({color.hex})
                        </s-text>
                      </s-stack>
                    ))}
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
