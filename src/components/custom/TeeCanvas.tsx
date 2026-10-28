"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BASE_PLACEMENT_SIZE, getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

const MIN_X = 8;
const MAX_X = 92;
const MIN_Y = 10;
const MAX_Y = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TeeCanvas({
  colorId,
  placements,
  selectedIndex,
  onSelect,
  onMove,
  className,
}: {
  colorId: TeeColorId;
  placements: StickerPlacement[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, x: number, y: number) => void;
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

  return (
    <div ref={containerRef} className={cn("touch-none select-none", className)}>
      <TeeShape colorId={colorId}>
        {placements.map((placement, index) => {
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
        })}
      </TeeShape>
    </div>
  );
}
