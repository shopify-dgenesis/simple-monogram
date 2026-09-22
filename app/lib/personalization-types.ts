import type { PersonalizationType } from "@prisma/client";

export interface FieldTemplate {
  key: string;
  label: string;
  inputType: "TEXT" | "NUMBER" | "DATE";
}

export interface PersonalizationTypeOption {
  value: PersonalizationType;
  label: string;
  description: string;
  example: string;
  fields: FieldTemplate[];
}

export const PERSONALIZATION_TYPE_OPTIONS: PersonalizationTypeOption[] = [
  {
    value: "STANDARD_TEXT",
    label: "Standard text",
    description: "A name, phrase, date, or short message.",
    example: "Forever Yours",
    fields: [{ key: "text", label: "Text", inputType: "TEXT" }],
  },
  {
    value: "SINGLE_INITIAL",
    label: "Single initial",
    description: "One letter.",
    example: "M",
    fields: [{ key: "initial1", label: "Initial", inputType: "TEXT" }],
  },
  {
    value: "TWO_INITIALS",
    label: "Two initials",
    description: "Two letters.",
    example: "MJ",
    fields: [
      { key: "initial1", label: "First Initial", inputType: "TEXT" },
      { key: "initial2", label: "Second Initial", inputType: "TEXT" },
    ],
  },
  {
    value: "THREE_INITIALS",
    label: "Three initials",
    description: "Three letters.",
    example: "MJN",
    fields: [
      { key: "initial1", label: "First Initial", inputType: "TEXT" },
      { key: "initial2", label: "Second Initial", inputType: "TEXT" },
      { key: "initial3", label: "Third Initial", inputType: "TEXT" },
    ],
  },
  {
    value: "BASIC_MONOGRAM",
    label: "Basic monogram",
    description: "First, middle, and last initial, arranged as a monogram.",
    example: "M · J · N",
    fields: [
      { key: "initial1", label: "First Initial", inputType: "TEXT" },
      { key: "initial2", label: "Middle Initial", inputType: "TEXT" },
      { key: "initial3", label: "Last Initial", inputType: "TEXT" },
    ],
  },
  {
    value: "NUMBER",
    label: "Number",
    description: "Jersey numbers, years, or IDs.",
    example: "23",
    fields: [{ key: "number", label: "Number", inputType: "NUMBER" }],
  },
  {
    value: "NAME_AND_DATE",
    label: "Name + date",
    description: "A name paired with a date.",
    example: "MARK — 09.22.26",
    fields: [
      { key: "name", label: "Name", inputType: "TEXT" },
      { key: "date", label: "Date", inputType: "DATE" },
    ],
  },
];

export function getPersonalizationTypeOption(type: PersonalizationType) {
  const option = PERSONALIZATION_TYPE_OPTIONS.find((o) => o.value === type);
  if (!option) {
    throw new Error(`Unknown personalization type: ${type}`);
  }
  return option;
}
