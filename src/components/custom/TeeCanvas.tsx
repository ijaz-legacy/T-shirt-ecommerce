"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BASE_PLACEMENT_SIZE, getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { TeeShapeBack } from "@/components/tee/TeeShapeBack";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

// ── 3D rotation limits ─────────────────────────────────────────────────
const ROT_Y_MIN = -40;
const ROT_Y_MAX = 40;
const ROT_X_MIN = -20;
const ROT_X_MAX = 20;

// ── Sticker placement bounds (% of container) ──────────────────────────
const MIN_X = 8;
const MAX_X = 92;
const MIN_Y = 10;
const MAX_Y = 90;

// ── Minimum sticker size in px – prevents invisible stickers ───────────
const MIN_STICKER_PX = 32;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ── Guidelines overlay ─────────────────────────────────────────────────
function GuidelinesOverlay({ face }: { face: "front" | "back" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Print area */}
      <div
        className="absolute rounded-lg border border-dashed border-rust/50"
        style={{ left: "28%", top: "39%", width: "44%", height: "41%" }}
      />
      {/* Safe zone */}
      <div
        className="absolute rounded border border-dotted border-gold/60"
        style={{ left: "32%", top: "42%", width: "36%", height: "34%" }}
      />
      {/* Centre lines */}
      <div className="absolute w-px bg-rust/30" style={{ left: "50%", top: "39%", height: "41%" }} />
      <div className="absolute h-px bg-rust/30" style={{ left: "28%", top: "59.5%", width: "44%" }} />
      {/* Labels */}
      <span
        className="absolute whitespace-nowrap rounded bg-rust/80 px-1.5 py-0.5 font-sans text-[8px] font-semibold uppercase tracking-wide text-paper"
        style={{ left: "28%", top: "calc(39% - 18px)" }}
      >
        {face === "back" ? "Back print area" : "Front print area"}
      </span>
      <span
        className="absolute whitespace-nowrap rounded bg-gold/70 px-1.5 py-0.5 font-sans text-[8px] font-semibold uppercase tracking-wide text-ink"
        style={{ left: "32%", top: "calc(42% - 16px)" }}
      >
        Safe zone
      </span>
    </div>
  );
}

// ── TeeCanvas ──────────────────────────────────────────────────────────
export function TeeCanvas({
  colorId,
  placements,
  selectedIndex,
  onSelect,
  onMove,
  face = "front",
  showGuidelines = false,
  allow3DRotate = false,
  className,
}: {
  colorId: TeeColorId;
  placements: StickerPlacement[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, x: number, y: number) => void;
  face?: "front" | "back";
  showGuidelines?: boolean;
  /** Dragging empty space rotates the shirt in 3D */
  allow3DRotate?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // sticker drag
  const stickerDrag = useRef<{ index: number; pointerId: number } | null>(null);

  // 3-D rotation
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const rotDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseY: number;
    baseX: number;
  } | null>(null);

  // ── sticker handlers ───────────────────────────────────────────
  function onStickerDown(e: ReactPointerEvent<HTMLElement>, index: number) {
    e.preventDefault();
    e.stopPropagation();       // don't bubble to 3-D container handler
    onSelect(index);
    stickerDrag.current = { index, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onStickerMove(e: ReactPointerEvent<HTMLElement>) {
    const d = stickerDrag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, MIN_X, MAX_X);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, MIN_Y, MAX_Y);
    onMove(d.index, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  function onStickerUp(e: ReactPointerEvent<HTMLElement>) {
    if (stickerDrag.current?.pointerId === e.pointerId) stickerDrag.current = null;
  }

  // ── 3-D rotation handlers (on outer div) ──────────────────────
  function onContainerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!allow3DRotate || stickerDrag.current) return;
    rotDrag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseY: rotY,
      baseX: rotX,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSpinning(true);
  }

  function onContainerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = rotDrag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setRotY(clamp(d.baseY + (e.clientX - d.startX) * 0.4, ROT_Y_MIN, ROT_Y_MAX));
    setRotX(clamp(d.baseX - (e.clientY - d.startY) * 0.22, ROT_X_MIN, ROT_X_MAX));
  }

  function onContainerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (rotDrag.current?.pointerId !== e.pointerId) return;
    rotDrag.current = null;
    setSpinning(false);
    // spring back to neutral
    setRotY(0);
    setRotX(0);
  }

  const Shell = face === "back" ? TeeShapeBack : TeeShape;
  const cw = containerRef.current?.offsetWidth ?? 220;

  return (
    <div
      ref={containerRef}
      className={cn(
        "touch-none select-none",
        allow3DRotate && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ perspective: allow3DRotate ? "1000px" : undefined }}
      onPointerDown={onContainerDown}
      onPointerMove={onContainerMove}
      onPointerUp={onContainerUp}
      onPointerCancel={onContainerUp}
    >
      {/* 3-D rotation wrapper */}
      <div
        style={
          allow3DRotate
            ? {
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
                transition: spinning
                  ? "none"
                  : "transform 0.55s cubic-bezier(0.22,1,0.36,1)",
                willChange: "transform",
              }
            : undefined
        }
      >
        <Shell colorId={colorId}>
          {showGuidelines && <GuidelinesOverlay face={face} />}

          {placements.map((placement, index) => {
            const parsed = parsePlacementRef(placement.ref);
            if (!parsed) return null;

            // Enforce minimum visible px size
            const rawW = BASE_PLACEMENT_SIZE * placement.scale;
            const rawPx = (rawW / 100) * cw;
            const finalW = rawPx < MIN_STICKER_PX ? (MIN_STICKER_PX / cw) * 100 : rawW;

            const selected = index === selectedIndex;
            const style: React.CSSProperties = {
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${finalW}%`,
              // no CSS transition on position — prevents jump when re-entering step
              transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
            };
            const ring = selected
              ? "ring-2 ring-ink ring-offset-2 ring-offset-transparent"
              : "hover:ring-1 hover:ring-ink/40";

            if (parsed.type === "image") {
              return (
                <button
                  key={`img-${index}`}
                  type="button"
                  aria-label={`Design ${index + 1}`}
                  onPointerDown={(e) => onStickerDown(e, index)}
                  onPointerMove={onStickerMove}
                  onPointerUp={onStickerUp}
                  className={cn(
                    "absolute aspect-square cursor-grab rounded-xl active:cursor-grabbing",
                    ring,
                  )}
                  style={style}
                >
                  <img
                    src={placement.ref}
                    alt=""
                    className="pointer-events-none h-full w-full object-contain"
                    draggable={false}
                  />
                </button>
              );
            }

            const sticker = getSticker(parsed.id);

            // Style override from StickerStyleEditor
            const style_ = placement.style;
            const hasBg = style_ && style_.bgShape !== "none";
            const bgStyle: React.CSSProperties = hasBg
              ? {
                  backgroundColor: style_.bgColor,
                  borderRadius:
                    style_.bgShape === "circle" ? "50%" :
                    style_.bgShape === "rounded" ? "22%" :
                    "0",
                }
              : {
                  backgroundColor: sticker.bg,
                  borderRadius: "50%",
                };

            return (
              <button
                key={`sticker-${index}`}
                type="button"
                aria-label={sticker.nameEn}
                onPointerDown={(e) => onStickerDown(e, index)}
                onPointerMove={onStickerMove}
                onPointerUp={onStickerUp}
                className={cn(
                  "absolute flex aspect-square cursor-grab items-center justify-center p-[8%] active:cursor-grabbing",
                  ring,
                )}
                style={{
                  ...style,
                  ...bgStyle,
                  boxShadow:
                    "inset 0 0 0 2px rgba(255,255,255,0.32), 0 10px 18px -8px rgba(23,21,18,0.35)",
                }}
              >
                <StickerArt sticker={sticker} />
              </button>
            );
          })}
        </Shell>
      </div>

      {/* Drag-to-rotate hint — shown only when shirt is empty and in 3D mode */}
      {allow3DRotate && placements.length === 0 && rotY === 0 && (
        <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] text-smoke/50">
          drag to rotate
        </p>
      )}
    </div>
  );
}
