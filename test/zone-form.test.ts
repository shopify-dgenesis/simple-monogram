import { describe, expect, it } from "vitest";
import { parseZoneForm } from "../app/lib/zone-form.server";

function formDataFrom(entries: [string, string][]) {
  const formData = new FormData();
  for (const [key, value] of entries) formData.append(key, value);
  return formData;
}

const validEntries: [string, string][] = [
  ["shopifyProductId", "gid://shopify/Product/1"],
  ["imageUrl", "https://cdn.shopify.com/1.png"],
  ["x", "0.5"],
  ["y", "0.4"],
  ["width", "0.24"],
  ["height", "0.08"],
  ["rotation", "-3"],
  ["alignment", "CENTER"],
  ["textAlign", "CENTER"],
  ["minFontSize", "10"],
  ["maxFontSize", "40"],
  ["defaultFontSize", "20"],
  ["autoFit", "true"],
  ["opacity", "1"],
  ["effect", "ENGRAVING"],
];

describe("parseZoneForm", () => {
  it("round-trips valid values without altering them", () => {
    const { values, errors } = parseZoneForm(formDataFrom(validEntries));

    expect(errors).toEqual({});
    expect(values).toMatchObject({
      shopifyProductId: "gid://shopify/Product/1",
      x: 0.5,
      y: 0.4,
      width: 0.24,
      height: 0.08,
      rotation: -3,
      autoFit: true,
      opacity: 1,
      effect: "ENGRAVING",
    });
  });

  it("requires a product", () => {
    const entries = validEntries.filter(([key]) => key !== "shopifyProductId");
    const { errors } = parseZoneForm(formDataFrom(entries));
    expect(errors.shopifyProductId).toBeTruthy();
  });

  it("clamps x/y so the zone cannot be positioned off-image", () => {
    const entries = validEntries.map(([k, v]) =>
      k === "x" ? ([k, "5"] as [string, string]) : ([k, v] as [string, string]),
    );
    const { values } = parseZoneForm(formDataFrom(entries));
    expect(values.x).toBeLessThanOrEqual(1 - values.width);
  });

  it("clamps rotation to +/-180 degrees", () => {
    const entries = validEntries.map(([k, v]) =>
      k === "rotation" ? (["rotation", "9000"] as [string, string]) : ([k, v] as [string, string]),
    );
    const { values } = parseZoneForm(formDataFrom(entries));
    expect(values.rotation).toBe(180);
  });

  it("rejects a maximum font size smaller than the minimum", () => {
    const entries = validEntries.map(([k, v]) =>
      k === "maxFontSize" ? (["maxFontSize", "5"] as [string, string]) : ([k, v] as [string, string]),
    );
    const { errors } = parseZoneForm(formDataFrom(entries));
    expect(errors.maxFontSize).toBeTruthy();
  });

  it("treats an empty effect as null (inherit template default)", () => {
    const entries = validEntries.filter(([key]) => key !== "effect");
    const { values } = parseZoneForm(formDataFrom(entries));
    expect(values.effect).toBeNull();
  });

  it("falls back to false for autoFit when not \"true\"", () => {
    const entries = validEntries.map(([k, v]) =>
      k === "autoFit" ? (["autoFit", "false"] as [string, string]) : ([k, v] as [string, string]),
    );
    const { values } = parseZoneForm(formDataFrom(entries));
    expect(values.autoFit).toBe(false);
  });
});
