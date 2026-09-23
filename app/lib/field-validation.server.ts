import type { AllowedCharacters, TextTransform } from "@prisma/client";

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

export interface ValidatableField {
  key: string;
  label: string;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  allowedCharacters: AllowedCharacters;
  customAllowedPattern: string | null;
  transform: TextTransform;
  disallowLeadingSpaces: boolean;
  disallowTrailingSpaces: boolean;
  collapseDuplicateSpaces: boolean;
  disableEmoji: boolean;
}

function escapeForCharClass(str: string) {
  return str.replace(/[\]\\^-]/g, "\\$&");
}

function buildAllowedPattern(field: ValidatableField): RegExp {
  switch (field.allowedCharacters) {
    case "LETTERS_ONLY":
      return /^[A-Za-z\s'-]*$/;
    case "NUMBERS_ONLY":
      return /^[0-9]*$/;
    case "CUSTOM": {
      const extra = escapeForCharClass(field.customAllowedPattern || "");
      return new RegExp("^[A-Za-z0-9\\s" + extra + "]*$");
    }
    case "LETTERS_AND_NUMBERS":
    default:
      return /^[A-Za-z0-9\s'-]*$/;
  }
}

export function applyTransform(value: string, transform: TextTransform): string {
  if (transform === "UPPERCASE") return value.toUpperCase();
  if (transform === "LOWERCASE") return value.toLowerCase();
  return value;
}

export function cleanSpacing(value: string, field: ValidatableField): string {
  let next = value;
  if (field.disallowLeadingSpaces) next = next.replace(/^\s+/, "");
  if (field.disallowTrailingSpaces) next = next.replace(/\s+$/, "");
  if (field.collapseDuplicateSpaces) next = next.replace(/\s{2,}/g, " ");
  return next;
}

export function validateFieldValue(rawValue: string, field: ValidatableField): string | null {
  const value = cleanSpacing(applyTransform(rawValue, field.transform), field);

  if (field.required && value.trim() === "") {
    return `${field.label} is required.`;
  }
  if (value !== "" && field.minLength != null && value.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} character(s).`;
  }
  if (field.maxLength != null && value.length > field.maxLength) {
    return `${field.label} must be ${field.maxLength} character(s) or fewer.`;
  }
  if (field.disableEmoji && EMOJI_PATTERN.test(value)) {
    return `${field.label} cannot contain emoji.`;
  }
  if (!buildAllowedPattern(field).test(value)) {
    return `${field.label} contains characters that aren't allowed.`;
  }
  return null;
}

export function normalizeFieldValue(rawValue: string, field: ValidatableField): string {
  return cleanSpacing(applyTransform(rawValue, field.transform), field);
}

export function composeDisplayText(
  type: string,
  values: Record<string, string>,
  keys: string[],
): string {
  const parts = keys.map((key) => (values[key] || "").trim());
  if (type === "NAME_AND_DATE") {
    return parts.filter(Boolean).join(" — ");
  }
  if (
    type === "SINGLE_INITIAL" ||
    type === "TWO_INITIALS" ||
    type === "THREE_INITIALS" ||
    type === "BASIC_MONOGRAM"
  ) {
    return parts.join("");
  }
  return parts.filter(Boolean).join(" ");
}
