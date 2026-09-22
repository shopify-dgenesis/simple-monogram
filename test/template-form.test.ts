import { describe, expect, it } from "vitest";
import { parseTemplateForm } from "../app/lib/template-form.server";

function formDataFrom(entries: [string, string][]) {
  const formData = new FormData();
  for (const [key, value] of entries) formData.append(key, value);
  return formData;
}

describe("parseTemplateForm", () => {
  it("splits s-choice-list's comma-joined multi-select values into separate ids", () => {
    const formData = formDataFrom([
      ["name", "Test"],
      ["effect", "PRINT"],
      ["allowedCharacters", "LETTERS_AND_NUMBERS"],
      ["transform", "NONE"],
      ["allowedFontIds", "font_a,font_b,font_c"],
      ["allowedColorPaletteIds", "palette_a,palette_b"],
    ]);

    const { values } = parseTemplateForm(formData);

    expect(values.allowedFontIds).toEqual(["font_a", "font_b", "font_c"]);
    expect(values.allowedColorPaletteIds).toEqual(["palette_a", "palette_b"]);
  });

  it("treats an empty selection as an empty array, not [\"\"]", () => {
    const formData = formDataFrom([
      ["name", "Test"],
      ["effect", "PRINT"],
      ["allowedCharacters", "LETTERS_AND_NUMBERS"],
      ["transform", "NONE"],
    ]);

    const { values } = parseTemplateForm(formData);

    expect(values.allowedFontIds).toEqual([]);
    expect(values.allowedColorPaletteIds).toEqual([]);
  });

  it("converts an empty defaultFontId select value to null", () => {
    const formData = formDataFrom([
      ["name", "Test"],
      ["effect", "PRINT"],
      ["allowedCharacters", "LETTERS_AND_NUMBERS"],
      ["transform", "NONE"],
      ["defaultFontId", ""],
    ]);

    const { values } = parseTemplateForm(formData);

    expect(values.defaultFontId).toBeNull();
  });

  it("flags a missing name as an error", () => {
    const formData = formDataFrom([
      ["effect", "PRINT"],
      ["allowedCharacters", "LETTERS_AND_NUMBERS"],
      ["transform", "NONE"],
    ]);

    const { errors } = parseTemplateForm(formData);

    expect(errors.name).toBeTruthy();
  });
});
