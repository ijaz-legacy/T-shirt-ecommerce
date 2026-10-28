"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BASE_PLACEMENT_SIZE, getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { TeeShapeBack } from "@/components/tee/TeeShapeBack";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

const MIN_X = 8;
const MAX_X = 92;
const MIN_Y = 10;
const MAX_Y = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Print-area guideline overlay.
 * Dimensions derived from TeeShape SVG viewBox (400×460):
 *   torso left edge  ≈ x=92  → 23%
 *   torso right edge ≈ x=308 → 77%
 *   chest top        ≈ y=180 → 39%
 *   hem              ≈ y=432 → 94%
 *   safe print zone  x=28%–72%, y=39%–80% (avoid seams/hem)
 */
function GuidelinesOverlay({ face }: { face: "front" | "back" }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      {/* ── Print area border ───────────────────────────────── */}
      <div
        className="absolute rounded-lg border border-dashed border-rust/50"
        style={{ left: "28%", top: "39%", width: "44%", height: "41%" }}
      />
      {/* ── Safe-zone inner boundary ────────────────────────── */}
      <div
        className="absolute rounded border border-dotted border-gold/60"
        style={{ left: "32%", top: "42%", width: "36%", height: "34%" }}
      />
      {/* ── Vertical center line ────────────────────────────── */}
      <div
        className="absolute w-px bg-rust/30"
        style={{ left: "50%", top: "39%", height: "41%" }}
      />
      {/* ── Horizontal center line ──────────────────────────── */}
      <div
        className="absolute h-px bg-rust/30"
        style={{ left: "28%", top: "59.5%", width: "44%" }}
      />
      {/* ── Labels ──────────────────────────────────────────── */}
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

export function TeeCanvas({
  colorId,
  placements,
  selectedIndex,
  onSelect,
  onMove,
  face = "front",
  showGuidelines = false,
  className,
}: {
  colorId: TeeColorId;
  placements: StickerPlacement[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, x: number, y: number) => void;
  face?: "front" | "back";
  showGuidelines?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>, index: number) {
    event.preventDefault();
    onSelect(index);
    dragRef.current = { index, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, MIN_X, MAX_X);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, MIN_Y, MAX_Y);
    onMove(drag.index, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  const Shell = face === "back" ? TeeShapeBack : TeeShape;

  const placements_ = placements.map((placement, index) => {
    const parsed = parsePlacementRef(placement.ref);
    if (!parsed) return null;
    const width = BASE_PLACEMENT_SIZE * placement.scale;
    const selected = index === selectedIndex;
    const style: React.CSSProperties = {
      left: `${placement.x}%`,
      top: `${placement.y}%`,
      width: `${width}%`,
      transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
    };
    const ring = selected
      ? "ring-2 ring-ink ring-offset-2 ring-offset-transparent"
      : "hover:ring-1 hover:ring-ink/40";

    if (parsed.type === "image") {
      return (
        <button
          key={`${placement.ref}-${index}`}
          type="button"
          aria-label={`Design ${index + 1}`}
          onPointerDown={(event) => handlePointerDown(event, index)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={cn(
            "absolute aspect-square cursor-grab rounded-xl transition-[left,top,width] duration-200 ease-out active:cursor-grabbing",
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
    return (
      <button
        key={`${placement.ref}-${index}`}
        type="button"
        aria-label={sticker.nameEn}
        onPointerDown={(event) => handlePointerDown(event, index)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "absolute flex aspect-square cursor-grab items-center justify-center rounded-full p-[8%] transition-[left,top,width] duration-200 ease-out active:cursor-grabbing",
          ring,
        )}
        style={{
          ...style,
          backgroundColor: sticker.bg,
          boxShadow:
            "inset 0 0 0 2px rgba(255,255,255,0.32), 0 10px 18px -8px rgba(23,21,18,0.35)",
        }}
      >
        <StickerArt sticker={sticker} />
      </button>
    );
  });

  return (
    <div ref={containerRef} className={cn("touch-none select-none", className)}>
      <Shell colorId={colorId}>
        {showGuidelines ? <GuidelinesOverlay face={face} /> : null}
        {placements_}
      </Shell>
    </div>
  );
}
