import type {
  AllowedCharacters,
  PersonalizationEffect,
  TextTransform,
} from "@prisma/client";
import type { TemplateRuleInput } from "../models/template.server";

const ALLOWED_CHARACTERS: AllowedCharacters[] = [
  "LETTERS_ONLY",
  "NUMBERS_ONLY",
  "LETTERS_AND_NUMBERS",
  "CUSTOM",
];
const TRANSFORMS: TextTransform[] = ["NONE", "UPPERCASE", "LOWERCASE"];
const EFFECTS: PersonalizationEffect[] = [
  "PRINT",
  "ENGRAVING",
  "EMBROIDERY",
  "FOIL",
  "DEBOSS",
  "EMBOSS",
];

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// s-choice-list submits all selected values as a single comma-joined
// string rather than one form entry per value.
function splitMultiValue(entries: string[]): string[] {
  return entries
    .flatMap((entry) => entry.split(","))
    .map((id) => id.trim())
    .filter((id) => id !== "");
}

export function parseTemplateForm(formData: FormData): {
  values: TemplateRuleInput;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) errors.name = "Name is required";

  const effectRaw = formData.get("effect") as string | null;
  const effect = (EFFECTS.includes(effectRaw as PersonalizationEffect)
    ? effectRaw
    : "PRINT") as PersonalizationEffect;

  const allowedCharactersRaw = formData.get("allowedCharacters") as string | null;
  const allowedCharacters = (ALLOWED_CHARACTERS.includes(
    allowedCharactersRaw as AllowedCharacters,
  )
    ? allowedCharactersRaw
    : "LETTERS_AND_NUMBERS") as AllowedCharacters;

  const transformRaw = formData.get("transform") as string | null;
  const transform = (TRANSFORMS.includes(transformRaw as TextTransform)
    ? transformRaw
    : "NONE") as TextTransform;

  const minLength = parseOptionalInt(formData.get("minLength"));
  const maxLength = parseOptionalInt(formData.get("maxLength"));
  if (minLength !== null && maxLength !== null && minLength > maxLength) {
    errors.maxLength = "Maximum characters must be greater than or equal to minimum";
  }

  const defaultFontIdRaw = formData.get("defaultFontId") as string | null;
  const defaultFontId = defaultFontIdRaw && defaultFontIdRaw.trim() !== "" ? defaultFontIdRaw : null;

  const values: TemplateRuleInput = {
    name,
    effect,
    confirmationRequired: formData.has("confirmationRequired"),
    required: formData.has("required"),
    minLength,
    maxLength,
    allowedCharacters,
    customAllowedPattern:
      allowedCharacters === "CUSTOM"
        ? ((formData.get("customAllowedPattern") as string | null) ?? null)
        : null,
    transform,
    cleanSpacing: formData.has("cleanSpacing"),
    disableEmoji: formData.has("disableEmoji"),
    defaultFontId,
    allowedFontIds: splitMultiValue(formData.getAll("allowedFontIds") as string[]),
    allowedColorPaletteIds: splitMultiValue(
      formData.getAll("allowedColorPaletteIds") as string[],
    ),
  };

  return { values, errors };
}
