import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createCustomization, CustomizationValidationError } from "../models/customization.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = body as {
    shopifyProductId?: string;
    shopifyVariantId?: string;
    fieldValues?: Record<string, string>;
    fontId?: string | null;
    colorId?: string | null;
    confirmed?: boolean;
    placement?: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      fontSize: number;
    };
  };

  if (!input.shopifyProductId || !input.shopifyVariantId || !input.placement) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const result = await createCustomization(session.shop, {
      shopifyProductId: input.shopifyProductId,
      shopifyVariantId: input.shopifyVariantId,
      fieldValues: input.fieldValues ?? {},
      fontId: input.fontId ?? null,
      colorId: input.colorId ?? null,
      confirmed: Boolean(input.confirmed),
      placement: input.placement,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof CustomizationValidationError) {
      return Response.json({ errors: error.errors }, { status: 400 });
    }
    throw error;
  }
};
