import { Form } from "react-router";
import type {
  AllowedCharacters,
  PersonalizationEffect,
  PersonalizationType,
  TextTransform,
} from "@prisma/client";
import { PERSONALIZATION_TYPE_OPTIONS } from "../lib/personalization-types";

export interface TemplateFormValues {
  name: string;
  type: PersonalizationType;
  effect: PersonalizationEffect;
  confirmationRequired: boolean;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  allowedCharacters: AllowedCharacters;
  customAllowedPattern: string | null;
  transform: TextTransform;
  cleanSpacing: boolean;
  disableEmoji: boolean;
  defaultFontId: string | null;
  allowedFontIds: string[];
  allowedColorPaletteIds: string[];
}

interface TemplateFormProps {
  mode: "create" | "edit";
  values: TemplateFormValues;
  fonts: { id: string; name: string; category: string }[];
  palettes: { id: string; name: string }[];
  errors?: Record<string, string>;
}

const EFFECT_OPTIONS: { value: PersonalizationEffect; label: string }[] = [
  { value: "PRINT", label: "Print" },
  { value: "ENGRAVING", label: "Engraving" },
  { value: "EMBROIDERY", label: "Embroidery" },
  { value: "FOIL", label: "Foil" },
  { value: "DEBOSS", label: "Deboss" },
  { value: "EMBOSS", label: "Emboss" },
];

const ALLOWED_CHARACTERS_OPTIONS: { value: AllowedCharacters; label: string }[] = [
  { value: "LETTERS_ONLY", label: "Letters only" },
  { value: "NUMBERS_ONLY", label: "Numbers only" },
  { value: "LETTERS_AND_NUMBERS", label: "Letters and numbers" },
  { value: "CUSTOM", label: "Custom allowed characters" },
];

const TRANSFORM_OPTIONS: { value: TextTransform; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "UPPERCASE", label: "Automatically uppercase" },
  { value: "LOWERCASE", label: "Automatically lowercase" },
];

export function TemplateForm({ mode, values, fonts, palettes, errors }: TemplateFormProps) {
  const typeOption = PERSONALIZATION_TYPE_OPTIONS.find((o) => o.value === values.type);

  return (
    <Form method="post">
      <s-section heading="Basics">
        <s-text-field
          name="name"
          label="Name"
          value={values.name}
          required
          error={errors?.name}
        ></s-text-field>

        {mode === "create" ? (
          <s-select name="type" label="Personalization type" value={values.type} required>
            {PERSONALIZATION_TYPE_OPTIONS.map((option) => (
              <s-option key={option.value} value={option.value}>
                {option.label} — {option.example}
              </s-option>
            ))}
          </s-select>
        ) : (
          <s-paragraph>
            <s-text color="subdued">Type: </s-text>
            {typeOption?.label}
          </s-paragraph>
        )}

        <s-select name="effect" label="Effect" value={values.effect} required>
          {EFFECT_OPTIONS.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))}
        </s-select>

        <s-checkbox
          name="confirmationRequired"
          label="Require customer to confirm spelling before adding to cart"
          checked={values.confirmationRequired}
        ></s-checkbox>
      </s-section>

      <s-section heading="Text rules">
        <s-checkbox
          name="required"
          label="Required field"
          checked={values.required}
        ></s-checkbox>

        <s-number-field
          name="minLength"
          label="Minimum characters"
          value={values.minLength !== null ? String(values.minLength) : ""}
          min={0}
        ></s-number-field>

        <s-number-field
          name="maxLength"
          label="Maximum characters"
          value={values.maxLength !== null ? String(values.maxLength) : ""}
          min={1}
        ></s-number-field>

        <s-select
          name="allowedCharacters"
          label="Allowed characters"
          value={values.allowedCharacters}
          required
        >
          {ALLOWED_CHARACTERS_OPTIONS.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))}
        </s-select>

        {values.allowedCharacters === "CUSTOM" && (
          <s-text-field
            name="customAllowedPattern"
            label="Additional allowed symbols"
            value={values.customAllowedPattern ?? ""}
            details="e.g. & . ' -"
          ></s-text-field>
        )}

        <s-select name="transform" label="Text case" value={values.transform} required>
          {TRANSFORM_OPTIONS.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))}
        </s-select>

        <s-checkbox
          name="cleanSpacing"
          label="Trim leading/trailing spaces and collapse duplicate spaces"
          checked={values.cleanSpacing}
        ></s-checkbox>

        <s-checkbox
          name="disableEmoji"
          label="Block emoji"
          checked={values.disableEmoji}
        ></s-checkbox>
      </s-section>

      <s-section heading="Fonts">
        <s-select
          name="defaultFontId"
          label="Default font"
          value={values.defaultFontId ?? ""}
          placeholder="No default"
        >
          <s-option value="">No default</s-option>
          {fonts.map((font) => (
            <s-option key={font.id} value={font.id}>
              {font.name} ({font.category})
            </s-option>
          ))}
        </s-select>

        <s-choice-list
          name="allowedFontIds"
          label="Available fonts"
          multiple
          values={values.allowedFontIds}
        >
          {fonts.map((font) => (
            <s-choice key={font.id} value={font.id}>
              {font.name}
            </s-choice>
          ))}
        </s-choice-list>
      </s-section>

      <s-section heading="Colors">
        <s-choice-list
          name="allowedColorPaletteIds"
          label="Available color palettes"
          multiple
          values={values.allowedColorPaletteIds}
        >
          {palettes.map((palette) => (
            <s-choice key={palette.id} value={palette.id}>
              {palette.name}
            </s-choice>
          ))}
        </s-choice-list>
      </s-section>

      <s-button type="submit" variant="primary">
        {mode === "create" ? "Create personalizer" : "Save changes"}
      </s-button>
    </Form>
  );
}
