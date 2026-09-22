import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

interface TemplateOption {
  id: string;
  name: string;
}

interface PickedProduct {
  id: string;
  title: string;
}

interface ProductAssignmentPanelProps {
  templates: TemplateOption[];
}

export function ProductAssignmentPanel({ templates }: ProductAssignmentPanelProps) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ assigned: string[]; skipped: string[]; limit: number | null }>();

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [pickedProducts, setPickedProducts] = useState<PickedProduct[]>([]);

  const isAssigning = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const { assigned, skipped, limit } = fetcher.data;
      if (assigned.length > 0) {
        shopify.toast.show(
          `Assigned ${assigned.length} product${assigned.length === 1 ? "" : "s"}`,
        );
      }
      if (skipped.length > 0) {
        shopify.toast.show(
          `${skipped.length} product${skipped.length === 1 ? "" : "s"} skipped — Free plan limit is ${limit}`,
          { isError: true },
        );
      }
      setPickedProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data, fetcher.state]);

  async function pickProducts() {
    const result = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
    });
    if (!result) return;
    setPickedProducts(result.map((p) => ({ id: p.id, title: p.title })));
  }

  function submit() {
    if (!templateId || pickedProducts.length === 0) return;
    const formData = new FormData();
    formData.set("intent", "assign");
    formData.set("templateId", templateId);
    for (const product of pickedProducts) {
      formData.append("shopifyProductIds", product.id);
    }
    fetcher.submit(formData, { method: "post" });
  }

  if (templates.length === 0) {
    return (
      <s-paragraph>
        Create an active personalizer first, then come back here to assign
        it to products.
      </s-paragraph>
    );
  }

  return (
    <s-stack direction="block" gap="base">
      <label>
        Personalizer
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4, maxWidth: 320 }}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <s-button variant="secondary" onClick={pickProducts}>
        Choose products
      </s-button>

      {pickedProducts.length > 0 && (
        <s-stack direction="block" gap="small-300">
          <s-text fontWeight="bold">
            {pickedProducts.length} product{pickedProducts.length === 1 ? "" : "s"} selected
          </s-text>
          <s-unordered-list>
            {pickedProducts.map((product) => (
              <s-list-item key={product.id}>{product.title}</s-list-item>
            ))}
          </s-unordered-list>
          <s-button variant="primary" onClick={submit} disabled={isAssigning}>
            {isAssigning ? "Assigning…" : "Assign"}
          </s-button>
        </s-stack>
      )}
    </s-stack>
  );
}
