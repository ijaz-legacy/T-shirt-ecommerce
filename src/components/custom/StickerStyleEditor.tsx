"use client";

/**
 * StickerStyleEditor
 *
 * A small modal that opens when a customer taps a sticker in the picker.
 * Lets them preview it and optionally add a background colour + shape
 * before placing it on the tee.
 *
 * Works for both built-in SVG stickers (builtin:*) and uploaded image stickers.
 */

import { useState } from "react";
import { Check, Circle, Square, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getSticker, isStickerId, parsePlacementRef } from "@/lib/catalog";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────
export type StickerBgShape = "none" | "circle" | "rounded" | "square";

export interface StickerStyle {
  bgShape: StickerBgShape;
  bgColor: string;
}

// ── Constants ──────────────────────────────────────────────────────────
export const DEFAULT_STICKER_STYLE: StickerStyle = {
  bgShape: "none",
  bgColor: "#FFFFFF",
};

const SHAPES: { id: StickerBgShape; label: string; node: React.ReactNode }[] = [
  {
    id: "none",
    label: "None",
    node: (
      <span className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-smoke/60 text-[9px] text-smoke">
        ✕
      </span>
    ),
  },
  {
    id: "circle",
    label: "Circle",
    node: <Circle size={18} strokeWidth={1.6} />,
  },
  {
    id: "rounded",
    label: "Rounded",
    node: <span className="h-5 w-5 rounded-xl border-2 border-current" />,
  },
  {
    id: "square",
    label: "Square",
    node: <Square size={18} strokeWidth={1.6} />,
  },
];

const PRESET_COLORS = [
  "#FFFFFF", "#F7F2E9", "#171512", "#C8542F",
  "#E9B44C", "#59634C", "#26374F", "#6C2E38",
  "#A9C3D6", "#D8C2A4", "#F0CBD2", "#EAD8B7",
  "#FF6B6B", "#4ECDC4",
];

// ── Component ──────────────────────────────────────────────────────────
export function StickerStyleEditor({
  stickerRef,
  initialStyle = DEFAULT_STICKER_STYLE,
  onConfirm,
  onCancel,
}: {
  /** The placement ref string — "builtin:sun" or "/api/images/uuid" */
  stickerRef: string;
  initialStyle?: StickerStyle;
  onConfirm: (style: StickerStyle) => void;
  onCancel: () => void;
}) {
  const [bgShape, setBgShape] = useState<StickerBgShape>(initialStyle.bgShape);
  const [bgColor, setBgColor] = useState(initialStyle.bgColor);

  const parsed = parsePlacementRef(stickerRef);
  const isBuiltin = parsed?.type === "builtin";
  const sticker =
    isBuiltin && parsed && isStickerId(parsed.id) ? getSticker(parsed.id) : null;

  // Preview wrapper style based on selected bg shape
  const previewBg: React.CSSProperties =
    bgShape === "none"
      ? {}
      : {
          backgroundColor: bgColor,
          borderRadius:
            bgShape === "circle" ? "50%" :
            bgShape === "rounded" ? "22%" :
            "0",
        };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Style sticker"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-t-[2rem] border border-line bg-paper sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold tracking-[-0.02em]">
              Style this sticker
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              Add a background shape and colour before placing.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 p-5">
          {/* Preview */}
          <div className="flex justify-center">
            <div
              className="grid h-[96px] w-[96px] place-items-center overflow-hidden transition-all duration-200"
              style={previewBg}
            >
              {sticker ? (
                /* built-in SVG sticker */
                <div
                  className="grid h-full w-full place-items-center p-[14%]"
                  style={
                    bgShape === "none"
                      ? { backgroundColor: sticker.bg, borderRadius: "16px" }
                      : {}
                  }
                >
                  <StickerArt sticker={sticker} />
                </div>
              ) : (
                /* image sticker */
                <img
                  src={stickerRef}
                  alt=""
                  className="h-full w-full object-contain p-2"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Background shape */}
          <div>
            <p className="mb-2 text-[11px] font-semibold text-ink">Background shape</p>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map(({ id, label, node }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBgShape(id)}
                  aria-pressed={bgShape === id}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-[10px] font-medium transition",
                    bgShape === id
                      ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                      : "border-line bg-paper hover:border-ink/30",
                  )}
                >
                  {node}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Background colour — only when a shape is chosen */}
          {bgShape !== "none" ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-ink">Background colour</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBgColor(hex)}
                    aria-label={`Colour ${hex}`}
                    title={hex}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      bgColor.toLowerCase() === hex.toLowerCase()
                        ? "scale-125 border-ink shadow"
                        : "border-line hover:scale-110",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* custom colour */}
                <label className="relative h-7 w-7 cursor-pointer rounded-full border-2 border-dashed border-smoke/50 transition-transform hover:scale-110 hover:border-ink">
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-smoke">
                    +
                  </span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Custom colour"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ bgShape, bgColor })}
            className={buttonClass({ size: "sm" })}
          >
            <Check size={14} />
            Add to tee
          </button>
        </div>
      </div>
    </div>
  );
}
