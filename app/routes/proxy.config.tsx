import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getStorefrontConfig } from "../models/storefront-config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const productIdParam = url.searchParams.get("productId");

  if (!session || !productIdParam) {
    return Response.json({ configured: false });
  }

  const result = await getStorefrontConfig(session.shop, productIdParam);
  return Response.json(result);
};
