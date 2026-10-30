"use client";

/**
 * StickerCropModal
 *
 * Lets the customer crop a placed sticker to the region they actually want.
 * Shows the sticker artwork in a square preview (same normalized space as the
 * tee canvas box) with a draggable + corner-resizable selection frame.
 *
 * Works for uploaded image stickers (/api/images/…) and built-in SVG stickers.
 * Applies the result as placement.style.crop — normalized 0–1 rect.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Crop, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getSticker, isStickerId, parsePlacementRef } from "@/lib/catalog";
import { StickerArt } from "@/components/tee/StickerArt";

export type CropRect = { x: number; y: number; w: number; h: number };

const MIN_CROP = 0.06; // smallest crop window (fraction of the box)

function clampCrop(c: CropRect): CropRect {
  const w = Math.min(1, Math.max(MIN_CROP, c.w));
  const h = Math.min(1, Math.max(MIN_CROP, c.h));
  const x = Math.min(1 - w, Math.max(0, c.x));
  const y = Math.min(1 - h, Math.max(0, c.y));
  return { x, y, w, h };
}

export function StickerCropModal({
  stickerRef,
  initialCrop,
  onApply,
  onCancel,
}: {
  /** The placement ref string — "builtin:<id>" or "/api/images/<uuid>" */
  stickerRef: string;
  /** Current crop to start from, if one was already applied. */
  initialCrop?: CropRect | null;
  onApply: (crop: CropRect | null) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<CropRect>(
    initialCrop ? clampCrop(initialCrop) : { x: 0, y: 0, w: 1, h: 1 },
  );
  const [changed, setChanged] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: "move" | "nw" | "ne" | "sw" | "se";
    pid: number;
    start: CropRect;
    sx: number;
    sy: number;
  } | null>(null);

  useEffect(() => {
    const onUp = () => { drag.current = null; };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  const onMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const dx = (e.clientX - d.sx) / rect.width;
    const dy = (e.clientY - d.sy) / rect.height;
    const s = d.start;

    if (d.mode === "move") {
      setCrop(clampCrop({
        x: s.x + dx, y: s.y + dy, w: s.w, h: s.h,
      }));
      return;
    }

    // corner resize
    const east = d.mode === "ne" || d.mode === "se";
    const south = d.mode === "sw" || d.mode === "se";
    let nx = east ? s.x : s.x + dx;
    let ny = south ? s.y : s.y + dy;
    let nw = east ? s.w + dx : s.w - dx;
    let nh = south ? s.h + dy : s.h - dy;
    // keep window inside 0..1
    if (nx < 0) { nw += nx; nx = 0; }
    if (ny < 0) { nh += ny; ny = 0; }
    nw = Math.min(nw, 1 - nx);
    nh = Math.min(nh, 1 - ny);
    setCrop(clampCrop({ x: nx, y: ny, w: nw, h: nh }));
  }, []);

  function startDrag(e: ReactPointerEvent<HTMLElement>, mode: "move" | "nw" | "ne" | "sw" | "se") {
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      mode, pid: e.pointerId,
      start: { ...crop },
      sx: e.clientX, sy: e.clientY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setChanged(true);
  }

  const parsed = parsePlacementRef(stickerRef);
  const sticker = parsed?.type === "builtin" && isStickerId(parsed.id)
    ? getSticker(parsed.id)
    : null;

  const pct = (v: number) => `${v * 100}%`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop sticker"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-t-[2rem] border border-line bg-paper sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-shell">
            <Crop size={15} strokeWidth={2} className="text-ink" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold tracking-[-0.02em]">
              Crop this sticker
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              Drag the frame to keep only the part you want printed.
            </p>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex justify-center bg-shell/60 px-5 py-5">
          <div className="w-full max-w-[280px]">
            <div
              ref={areaRef}
              onPointerMove={onMove}
              className="relative w-full select-none touch-none overflow-hidden rounded-2xl border border-line bg-paper"
              style={{
                aspectRatio: "1",
                backgroundImage:
                  "repeating-conic-gradient(#e7e5e0 0% 25%, #fbfaf8 0% 50%)",
                backgroundSize: "14px 14px",
              }}
            >
              {sticker ? (
                <StickerArt
                  sticker={sticker}
                  fgOverride={undefined}
                  accentOverride={undefined}
                />
              ) : (
                <img
                  src={stickerRef}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                />
              )}

              {/* Dimmed outside of selection */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute bg-ink/55" style={{
                  left: 0, top: 0, right: 0,
                  height: pct(crop.y),
                }} />
                <div className="absolute bg-ink/55" style={{
                  left: 0, bottom: 0, right: 0,
                  height: pct(1 - crop.y - crop.h),
                }} />
                <div className="absolute bg-ink/55" style={{
                  left: 0,
                  top: pct(crop.y),
                  width: pct(crop.x),
                  height: pct(crop.h),
                }} />
                <div className="absolute bg-ink/55" style={{
                  right: 0,
                  top: pct(crop.y),
                  width: pct(1 - crop.x - crop.w),
                  height: pct(crop.h),
                }} />
              </div>

              {/* Selection frame */}
              <div
                onPointerDown={(e) => startDrag(e, "move")}
                className="absolute cursor-move"
                style={{
                  left: pct(crop.x),
                  top: pct(crop.y),
                  width: pct(crop.w),
                  height: pct(crop.h),
                  border: "2px solid #C8542F",
                  boxShadow: "0 0 0 1px rgba(255,255,255,.8) inset",
                  touchAction: "none",
                }}
              >
                {(
                  [
                    ["nw", { top: -5, left: -5, cursor: "nwse-resize" }],
                    ["ne", { top: -5, right: -5, cursor: "nesw-resize" }],
                    ["sw", { bottom: -5, left: -5, cursor: "nesw-resize" }],
                    ["se", { bottom: -5, right: -5, cursor: "nwse-resize" }],
                  ] as const
                ).map(([mode, pos]) => (
                  <span
                    key={mode}
                    onPointerDown={(e) => startDrag(e, mode)}
                    className="absolute h-3 w-3 rounded-full border-2 border-paper bg-rust shadow-sm"
                    style={{ ...pos, touchAction: "none" }}
                  />
                ))}
              </div>
            </div>

            {(changed || (initialCrop != null)) && (
              <button
                type="button"
                onClick={() => { setCrop({ x: 0, y: 0, w: 1, h: 1 }); setChanged(true); }}
                className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-[10px] font-medium text-smoke transition hover:border-ink/40 hover:text-ink"
              >
                <RotateCcw size={11} />
                Reset to full sticker
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
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
            onClick={() =>
              onApply(
                !changed && !initialCrop
                  ? null
                  : crop.w >= 0.999 && crop.h >= 0.999 && crop.x < 0.001 && crop.y < 0.001
                    ? null
                    : crop,
              )
            }
            className={buttonClass({ size: "sm" })}
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

