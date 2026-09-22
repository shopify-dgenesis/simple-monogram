import { useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { PersonalizationEffect, ZoneAlignment } from "@prisma/client";

export interface ZoneDraft {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alignment: ZoneAlignment;
  textAlign: ZoneAlignment;
  minFontSize: number;
  maxFontSize: number;
  defaultFontSize: number;
  autoFit: boolean;
  opacity: number;
  effect: PersonalizationEffect | null;
}

export interface ZoneSummary extends ZoneDraft {
  id: string;
  shopifyProductId: string;
  imageUrl: string | null;
}

interface FontOption {
  id: string;
  name: string;
  family: string;
}

interface PaletteOption {
  id: string;
  name: string;
  colors: { id: string; name: string; hex: string }[];
}

interface PlacementStudioProps {
  templateEffect: PersonalizationEffect;
  zones: ZoneSummary[];
  fonts: FontOption[];
  palettes: PaletteOption[];
}

const DEFAULT_DRAFT: ZoneDraft = {
  x: 0.38,
  y: 0.46,
  width: 0.24,
  height: 0.08,
  rotation: 0,
  alignment: "CENTER",
  textAlign: "CENTER",
  minFontSize: 10,
  maxFontSize: 40,
  defaultFontSize: 20,
  autoFit: true,
  opacity: 1,
  effect: null,
};

const EFFECT_OPTIONS: { value: PersonalizationEffect; label: string }[] = [
  { value: "PRINT", label: "Print" },
  { value: "ENGRAVING", label: "Engraving" },
  { value: "EMBROIDERY", label: "Embroidery" },
  { value: "FOIL", label: "Foil" },
  { value: "DEBOSS", label: "Deboss" },
  { value: "EMBOSS", label: "Emboss" },
];

const ALIGNMENT_OPTIONS: ZoneAlignment[] = ["LEFT", "CENTER", "RIGHT"];

function effectTextStyle(
  effect: PersonalizationEffect,
  color: string,
): React.CSSProperties {
  switch (effect) {
    case "ENGRAVING":
      return { color, opacity: 0.55, textShadow: "0 1px 0 rgba(255,255,255,0.4)" };
    case "EMBROIDERY":
      return { color, textShadow: "0.5px 0.5px 0 rgba(0,0,0,0.35)" };
    case "FOIL":
      return { color, textShadow: "0 0 2px rgba(255,255,255,0.8)", fontWeight: 700 };
    case "DEBOSS":
      return { color, textShadow: "-1px -1px 0 rgba(255,255,255,0.5), 1px 1px 1px rgba(0,0,0,0.4)" };
    case "EMBOSS":
      return { color, textShadow: "1px 1px 0 rgba(255,255,255,0.6), -1px -1px 1px rgba(0,0,0,0.4)" };
    case "PRINT":
    default:
      return { color };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PlacementStudio({
  templateEffect,
  zones,
  fonts,
  palettes,
}: PlacementStudioProps) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    zones[0]?.shopifyProductId ?? null,
  );
  const [imageUrl, setImageUrl] = useState<string | null>(zones[0]?.imageUrl ?? null);
  const [draft, setDraft] = useState<ZoneDraft>(
    zones[0]
      ? { ...zones[0] }
      : { ...DEFAULT_DRAFT },
  );
  const [previewText, setPreviewText] = useState("MARK");
  const [previewFontId, setPreviewFontId] = useState(fonts[0]?.id ?? "");
  const [previewColorHex, setPreviewColorHex] = useState(
    palettes[0]?.colors[0]?.hex ?? "#1a1a1a",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const resizeState = useRef<{
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  const selectedFont = fonts.find((f) => f.id === previewFontId);
  const effectiveEffect = draft.effect ?? templateEffect;

  function loadZone(zone: ZoneSummary) {
    setSelectedProductId(zone.shopifyProductId);
    setImageUrl(zone.imageUrl);
    setDraft({ ...zone });
  }

  async function pickProduct() {
    const result = await shopify.resourcePicker({ type: "product", action: "select" });
    if (!result || result.length === 0) return;
    const product = result[0];
    const existing = zones.find((z) => z.shopifyProductId === product.id);
    setSelectedProductId(product.id);
    setImageUrl(product.images?.[0]?.originalSrc ?? null);
    setDraft(existing ? { ...existing } : { ...DEFAULT_DRAFT });
  }

  function handleBoxPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: draft.x,
      originY: draft.y,
    };
  }

  function handleBoxPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (event.clientX - dragState.current.startX) / rect.width;
    const dy = (event.clientY - dragState.current.startY) / rect.height;
    setDraft((prev) => ({
      ...prev,
      x: clamp(dragState.current!.originX + dx, 0, 1 - prev.width),
      y: clamp(dragState.current!.originY + dy, 0, 1 - prev.height),
    }));
  }

  function handleBoxPointerUp() {
    dragState.current = null;
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originWidth: draft.width,
      originHeight: draft.height,
    };
  }

  function handleResizePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizeState.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (event.clientX - resizeState.current.startX) / rect.width;
    const dy = (event.clientY - resizeState.current.startY) / rect.height;

    const rad = (draft.rotation * Math.PI) / 180;
    const localDx = dx * Math.cos(rad) + dy * Math.sin(rad);
    const localDy = -dx * Math.sin(rad) + dy * Math.cos(rad);

    setDraft((prev) => ({
      ...prev,
      width: clamp(resizeState.current!.originWidth + localDx, 0.02, 1 - prev.x),
      height: clamp(resizeState.current!.originHeight + localDy, 0.02, 1 - prev.y),
    }));
  }

  function handleResizePointerUp() {
    resizeState.current = null;
  }

  function save() {
    if (!selectedProductId) return;
    const formData = new FormData();
    formData.set("intent", "save");
    formData.set("shopifyProductId", selectedProductId);
    formData.set("imageUrl", imageUrl ?? "");
    formData.set("x", String(draft.x));
    formData.set("y", String(draft.y));
    formData.set("width", String(draft.width));
    formData.set("height", String(draft.height));
    formData.set("rotation", String(draft.rotation));
    formData.set("alignment", draft.alignment);
    formData.set("textAlign", draft.textAlign);
    formData.set("minFontSize", String(draft.minFontSize));
    formData.set("maxFontSize", String(draft.maxFontSize));
    formData.set("defaultFontSize", String(draft.defaultFontSize));
    formData.set("autoFit", String(draft.autoFit));
    formData.set("opacity", String(draft.opacity));
    formData.set("effect", draft.effect ?? "");
    fetcher.submit(formData, { method: "post" });
  }

  const isSaving = fetcher.state !== "idle";

  const previewFontFamily = useMemo(
    () => selectedFont?.family ?? "inherit",
    [selectedFont],
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
      <div style={{ flex: "1 1 420px", minWidth: "280px" }}>
        {!imageUrl ? (
          <s-box padding="large" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                Choose a product to place a personalization zone on its
                image.
              </s-paragraph>
              <s-button onClick={pickProduct}>Choose product</s-button>
            </s-stack>
          </s-box>
        ) : (
          <>
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                userSelect: "none",
                touchAction: "none",
              }}
            >
              <img
                src={imageUrl}
                alt="Product"
                style={{ width: "100%", display: "block", borderRadius: 8 }}
                draggable={false}
              />
              <div
                onPointerDown={handleBoxPointerDown}
                onPointerMove={handleBoxPointerMove}
                onPointerUp={handleBoxPointerUp}
                style={{
                  position: "absolute",
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.width * 100}%`,
                  height: `${draft.height * 100}%`,
                  transform: `rotate(${draft.rotation}deg)`,
                  transformOrigin: "center",
                  border: "2px solid #2563eb",
                  background: "rgba(37,99,235,0.12)",
                  cursor: "move",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    draft.textAlign === "LEFT"
                      ? "flex-start"
                      : draft.textAlign === "RIGHT"
                        ? "flex-end"
                        : "center",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily: previewFontFamily,
                    fontSize: `${clamp(draft.defaultFontSize, 8, 28)}px`,
                    lineHeight: 1,
                    opacity: draft.opacity,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    ...effectTextStyle(effectiveEffect, previewColorHex),
                  }}
                >
                  {previewText || "MARK"}
                </span>
                <div
                  onPointerDown={handleResizePointerDown}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  style={{
                    position: "absolute",
                    right: -7,
                    bottom: -7,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#2563eb",
                    border: "2px solid white",
                    cursor: "nwse-resize",
                  }}
                />
              </div>
            </div>
            <s-button variant="secondary" onClick={pickProduct}>
              Choose a different product
            </s-button>
          </>
        )}

        {zones.length > 0 && (
          <s-box padding="base">
            <s-stack direction="block" gap="small-300">
              <s-text fontWeight="bold">Configured zones</s-text>
              <s-stack direction="inline" gap="small-300">
                {zones.map((zone) => (
                  <s-button
                    key={zone.id}
                    variant={zone.shopifyProductId === selectedProductId ? "primary" : "secondary"}
                    onClick={() => loadZone(zone)}
                  >
                    {zone.shopifyProductId.split("/").pop()}
                  </s-button>
                ))}
              </s-stack>
            </s-stack>
          </s-box>
        )}
      </div>

      <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
        <s-stack direction="block" gap="base">
          <label>
            Preview text
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          {fonts.length > 0 && (
            <label>
              Preview font
              <select
                value={previewFontId}
                onChange={(e) => setPreviewFontId(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              >
                {fonts.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {palettes.length > 0 && (
            <label>
              Preview color
              <select
                value={previewColorHex}
                onChange={(e) => setPreviewColorHex(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              >
                {palettes.map((palette) => (
                  <optgroup key={palette.id} label={palette.name}>
                    {palette.colors.map((color) => (
                      <option key={color.id} value={color.hex}>
                        {color.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <label>
            Effect
            <select
              value={draft.effect ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  effect: (e.target.value || null) as PersonalizationEffect | null,
                }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            >
              <option value="">Use template default ({templateEffect})</option>
              {EFFECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rotation ({draft.rotation.toFixed(0)}°)
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={draft.rotation}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, rotation: Number(e.target.value) }))
              }
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <label>
            Alignment
            <select
              value={draft.alignment}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, alignment: e.target.value as ZoneAlignment }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            >
              {ALIGNMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Text alignment
            <select
              value={draft.textAlign}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, textAlign: e.target.value as ZoneAlignment }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            >
              {ALIGNMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Minimum font size ({draft.minFontSize}px)
            <input
              type="number"
              min={1}
              value={draft.minFontSize}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, minFontSize: Number(e.target.value) }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <label>
            Maximum font size ({draft.maxFontSize}px)
            <input
              type="number"
              min={1}
              value={draft.maxFontSize}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, maxFontSize: Number(e.target.value) }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <label>
            Default font size ({draft.defaultFontSize}px)
            <input
              type="number"
              min={1}
              value={draft.defaultFontSize}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, defaultFontSize: Number(e.target.value) }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={draft.autoFit}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, autoFit: e.target.checked }))
              }
            />
            Auto-fit text to zone
          </label>

          <label>
            Preview opacity ({Math.round(draft.opacity * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.opacity}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, opacity: Number(e.target.value) }))
              }
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <s-button
            variant="primary"
            onClick={save}
            disabled={!selectedProductId || isSaving}
          >
            {isSaving ? "Saving…" : "Save zone"}
          </s-button>
        </s-stack>
      </div>
    </div>
  );
}
