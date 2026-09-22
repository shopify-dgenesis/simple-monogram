import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import {
  assignProducts,
  PLAN_PRODUCT_LIMITS,
  PlanLimitReachedError,
  removeAssignment,
  setAssignmentEnabled,
} from "../models/assignment.server";
import { ProductAssignmentPanel } from "../components/ProductAssignmentPanel";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const [assignments, templates] = await Promise.all([
    db.productAssignment.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      include: { template: { select: { name: true } } },
    }),
    db.personalizationTemplate.findMany({
      where: { shopId: shop.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const activeCount = assignments.filter((a) => a.enabled).length;
  const limit = PLAN_PRODUCT_LIMITS[shop.plan];

  return { assignments, templates, activeCount, limit, plan: shop.plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "assign") {
    const templateId = formData.get("templateId") as string;
    const shopifyProductIds = formData.getAll("shopifyProductIds") as string[];
    const result = await assignProducts(shop.id, templateId, shopifyProductIds);
    return result;
  }

  if (intent === "toggle") {
    const assignmentId = formData.get("assignmentId") as string;
    const enabled = formData.get("enabled") === "true";
    try {
      await setAssignmentEnabled(shop.id, assignmentId, enabled);
      return { ok: true };
    } catch (error) {
      if (error instanceof PlanLimitReachedError) {
        return data(
          { ok: false, error: "Free plan limit reached. Upgrade to Pro for unlimited products." },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "remove") {
    const assignmentId = formData.get("assignmentId") as string;
    await removeAssignment(shop.id, assignmentId);
    return { ok: true };
  }

  return data({ ok: false, error: "Unknown action" }, { status: 400 });
};

export default function Products() {
  const { assignments, templates, activeCount, limit, plan } = useLoaderData<typeof loader>();

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

      <s-section heading="Assign products">
        <ProductAssignmentPanel templates={templates} />
      </s-section>

      <s-section>
        {assignments.length === 0 ? (
          <s-empty-state heading="No products assigned yet">
            <s-paragraph slot="subheading">
              Assign a personalizer to products above so customers can
              personalize them on the storefront.
            </s-paragraph>
          </s-empty-state>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Personalizer</s-table-header>
              <s-table-header>Source</s-table-header>
              <s-table-header>Enabled</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {assignments.map((assignment) => (
                <s-table-row key={assignment.id}>
                  <s-table-cell>{assignment.shopifyProductId.split("/").pop()}</s-table-cell>
                  <s-table-cell>{assignment.template.name}</s-table-cell>
                  <s-table-cell>{assignment.assignmentSource}</s-table-cell>
                  <s-table-cell>{assignment.enabled ? "Yes" : "No"}</s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-300">
                      <form method="post">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={(!assignment.enabled).toString()}
                        />
                        <s-button type="submit" variant="secondary">
                          {assignment.enabled ? "Disable" : "Enable"}
                        </s-button>
                      </form>
                      <form method="post">
                        <input type="hidden" name="intent" value="remove" />
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <s-button type="submit" variant="secondary" tone="critical">
                          Unassign
                        </s-button>
                      </form>
                    </s-stack>
                  </s-table-cell>
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
