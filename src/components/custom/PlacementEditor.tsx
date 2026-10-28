"use client";

/**
 * PlacementEditor
 *
 * A slide-up bottom panel shown when a placed sticker / image / text is selected.
 * Lets the customer change:
 *   Built-in stickers : background colour + shape, fg colour, accent colour
 *   Uploaded images   : background shape + colour (transparent by default)
 *   Text              : content, font, colour, bold, italic
 *
 * Does NOT block placing — the customer places first, then edits here.
 */

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { getSticker, isStickerId, parsePlacementRef } from "@/lib/catalog";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";
import type { StickerPlacement } from "@/lib/types";

// ── Colour presets ─────────────────────────────────────────────────────
const COLORS = [
  "#FFFFFF", "#F7F2E9", "#171512", "#C8542F",
  "#E9B44C", "#59634C", "#26374F", "#6C2E38",
  "#A9C3D6", "#D8C2A4", "#F0CBD2", "#EAD8B7",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFE66D", "#FF6B9D", "#C7CEEA", "#B8F0E6",
];

type BgShape = "transparent" | "circle" | "rounded" | "square";

const SHAPES: { id: BgShape; label: string; cls: string }[] = [
  { id: "transparent", label: "None",    cls: "rounded-none border-dashed" },
  { id: "circle",      label: "Circle",  cls: "rounded-full" },
  { id: "rounded",     label: "Rounded", cls: "rounded-2xl" },
  { id: "square",      label: "Square",  cls: "rounded-none" },
];

const FONTS: { id: "sans" | "serif" | "display" | "mono"; label: string; style: string }[] = [
  { id: "sans",    label: "Clean",   style: "font-sans" },
  { id: "display", label: "Bold",    style: "font-display" },
  { id: "serif",   label: "Elegant", style: "font-serif" },
  { id: "mono",    label: "Mono",    style: "font-mono" },
];

// ── Mini colour picker ─────────────────────────────────────────────────
function ColorRow({
  label, value, onChange,
}: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={cn(
              "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
              value.toLowerCase() === c.toLowerCase()
                ? "scale-125 border-ink shadow-sm"
                : "border-line",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="relative h-6 w-6 cursor-pointer rounded-full border-2 border-dashed border-smoke/40 transition-transform hover:scale-110">
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-smoke">+</span>
          <input
            type="color" value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function PlacementEditor({
  placement,
  index,
  onChange,
  onRemove,
}: {
  placement: StickerPlacement;
  index: number;
  onChange: (index: number, patch: Partial<StickerPlacement>) => void;
  onRemove: (index: number) => void;
}) {
  const parsed = parsePlacementRef(placement.ref);
  const isText = placement.ref.startsWith("text:");
  const isBuiltin = parsed?.type === "builtin";
  const isImage = parsed?.type === "image";

  const sticker = isBuiltin && parsed && isStickerId(parsed.id) ? getSticker(parsed.id) : null;
  const styleOv = placement.style ?? { bgShape: "transparent" as BgShape, bgColor: "#FFFFFF" };

  const bgShape = (styleOv.bgShape as BgShape) ?? "transparent";
  const bgColor = styleOv.bgColor ?? "#FFFFFF";
  const fgColor = styleOv.fg ?? sticker?.fg ?? "#171512";
  const accentColor = styleOv.accent ?? sticker?.accent ?? "#C8542F";

  function patchStyle(patch: Partial<NonNullable<StickerPlacement["style"]>>) {
    onChange(index, { style: { ...styleOv, ...patch } });
  }

  function patchText(patch: Partial<NonNullable<StickerPlacement["text"]>>) {
    onChange(index, { text: { ...(placement.text ?? { content: "", fontFamily: "sans", color: "#171512", bold: false, italic: false }), ...patch } });
  }

  // ── Preview mini thumbnail ─────────────────────────────────────────
  const previewBg =
    bgShape === "transparent" ? (sticker ? sticker.bg : "transparent") : bgColor;
  const previewRadius =
    bgShape === "circle"  ? "50%" :
    bgShape === "rounded" ? "20%" :
    bgShape === "square"  ? "4px" : "50%";

  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mini preview */}
          {sticker ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center p-[10%]"
              style={{ backgroundColor: previewBg, borderRadius: previewRadius, boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}
            >
              <StickerArt sticker={sticker} fgOverride={fgColor} accentOverride={accentColor} />
            </div>
          ) : isText ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-shell text-[11px] font-bold text-smoke">
              Aa
            </div>
          ) : (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line bg-shell">
              <img src={placement.ref} alt="" className="h-full w-full object-contain p-1" draggable={false} />
            </div>
          )}
          <div>
            <p className="text-[12px] font-semibold">
              {isText ? (placement.text?.content.slice(0, 20) || "Text") :
               sticker ? sticker.nameEn :
               "Your image"}
            </p>
            <p className="text-[10px] text-smoke">
              {Math.round(placement.scale)}% · {Math.round(placement.rotation)}°
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-smoke transition hover:bg-rust/8 hover:text-rust"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* ── Text editing ──────────────────────────────────── */}
        {isText ? (
          <>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke">
                Text
              </p>
              <textarea
                rows={2}
                value={placement.text?.content ?? ""}
                onChange={(e) => patchText({ content: e.target.value })}
                placeholder="Type your text…"
                className="w-full resize-none rounded-xl border border-line bg-shell px-3 py-2 text-[13px] text-ink placeholder:text-smoke/50 focus:border-ink/60 focus:outline-none"
                maxLength={120}
              />
            </div>

            {/* Font */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke">
                Font
              </p>
              <div className="flex gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => patchText({ fontFamily: f.id })}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[11px] transition",
                      f.style,
                      placement.text?.fontFamily === f.id
                        ? "border-ink bg-ink/5 ring-1 ring-ink"
                        : "border-line hover:border-ink/30",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bold / Italic */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => patchText({ bold: !placement.text?.bold })}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-[14px] font-bold transition",
                  placement.text?.bold ? "border-ink bg-ink text-paper" : "border-line text-smoke hover:border-ink/30",
                )}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => patchText({ italic: !placement.text?.italic })}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-[14px] italic transition",
                  placement.text?.italic ? "border-ink bg-ink text-paper" : "border-line text-smoke hover:border-ink/30",
                )}
              >
                I
              </button>
            </div>

            {/* Text colour */}
            <ColorRow
              label="Text colour"
              value={placement.text?.color ?? "#171512"}
              onChange={(c) => patchText({ color: c })}
            />
          </>
        ) : null}

        {/* ── Built-in sticker theme ─────────────────────────── */}
        {sticker ? (
          <>
            <ColorRow label="Main colour"   value={fgColor}    onChange={(c) => patchStyle({ fg: c })} />
            <ColorRow label="Accent colour" value={accentColor} onChange={(c) => patchStyle({ accent: c })} />
          </>
        ) : null}

        {/* ── Background shape (stickers + images) ────────────── */}
        {!isText ? (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-smoke">
              Background shape
            </p>
            <div className="flex gap-2">
              {SHAPES.map((s) => {
                const active = bgShape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patchStyle({ bgShape: s.id })}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 border py-2 text-[10px] font-medium transition",
                      s.cls,
                      active ? "border-ink bg-ink/5 ring-1 ring-ink" : "border-line hover:border-ink/30",
                    )}
                  >
                    <span
                      className={cn("h-5 w-5 border-2 border-current", s.cls)}
                      style={s.id === "transparent" ? { borderStyle: "dashed" } : {}}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── Background colour (when shape is not transparent) ── */}
        {!isText && bgShape !== "transparent" ? (
          <ColorRow label="Background colour" value={bgColor} onChange={(c) => patchStyle({ bgColor: c })} />
        ) : null}

        {/* ── Size + rotation fine-tune ────────────────────────── */}
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="flex justify-between text-[10px] font-semibold text-smoke">
              Size
              <span className="text-ink">{Math.round(placement.scale)}%</span>
            </span>
            <input
              type="range" min={8} max={72} step={1}
              value={placement.scale}
              onChange={(e) => onChange(index, { scale: Number(e.target.value) })}
              className="mt-1 w-full accent-ink"
            />
          </label>
          <label className="flex-1">
            <span className="flex justify-between text-[10px] font-semibold text-smoke">
              Rotate
              <span className="text-ink">{Math.round(placement.rotation)}°</span>
            </span>
            <input
              type="range" min={-180} max={180} step={1}
              value={placement.rotation}
              onChange={(e) => onChange(index, { rotation: Number(e.target.value) })}
              className="mt-1 w-full accent-ink"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
