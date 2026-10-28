"use client";

/**
 * TeeCanvas — PowerPoint-style sticker editor
 *
 * Each placed sticker is an absolutely-positioned element with:
 *   • Free drag (move anywhere on the shirt)
 *   • Corner resize handles (drag to resize, maintains aspect ratio)
 *   • Rotation handle (drag the top handle to rotate)
 *   • Delete button when selected
 *
 * Sizing model:
 *   placement.x / placement.y  = center of element as % of container (0–100)
 *   placement.scale             = width of element as % of container (5–80)
 *   placement.rotation          = degrees (-180 to +180)
 *
 * The shirt print area spans roughly x=28%–72%, y=39%–80% of the container.
 * We clamp to that area by default and allow free movement within the full shirt.
 */

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { TeeShapeBack } from "@/components/tee/TeeShapeBack";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

// ── Constants ──────────────────────────────────────────────────────────
const MIN_SIZE_PCT = 8;    // minimum element width as % of container
const MAX_SIZE_PCT = 75;   // maximum element width as % of container
const ROT_Y_MIN = -40;
const ROT_Y_MAX = 40;
const ROT_X_MIN = -20;
const ROT_X_MAX = 20;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function deg2rad(d: number) { return (d * Math.PI) / 180; }

// ── Guidelines overlay ─────────────────────────────────────────────────
function GuidelinesOverlay({ face }: { face: "front" | "back" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute rounded-lg border border-dashed border-rust/50"
        style={{ left: "28%", top: "39%", width: "44%", height: "41%" }} />
      <div className="absolute rounded border border-dotted border-gold/60"
        style={{ left: "32%", top: "42%", width: "36%", height: "34%" }} />
      <div className="absolute w-px bg-rust/25" style={{ left: "50%", top: "39%", height: "41%" }} />
      <div className="absolute h-px bg-rust/25" style={{ left: "28%", top: "59.5%", width: "44%" }} />
      <span className="absolute whitespace-nowrap rounded bg-rust/75 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-paper"
        style={{ left: "28%", top: "calc(39% - 17px)" }}>
        {face === "back" ? "Back print area" : "Front print area"}
      </span>
      <span className="absolute whitespace-nowrap rounded bg-gold/70 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-ink"
        style={{ left: "32%", top: "calc(42% - 15px)" }}>
        Safe zone
      </span>
    </div>
  );
}

// ── Selection frame with handles ───────────────────────────────────────
interface HandleProps {
  cursor: string;
  style: React.CSSProperties;
  onPointerDown: (e: ReactPointerEvent<HTMLSpanElement>) => void;
}

function Handle({ cursor, style, onPointerDown }: HandleProps) {
  return (
    <span
      onPointerDown={onPointerDown}
      className="absolute z-10 block touch-none"
      style={{
        width: 14,
        height: 14,
        background: "#fff",
        border: "2px solid #171512",
        borderRadius: 3,
        cursor,
        transform: "translate(-50%,-50%)",
        boxShadow: "0 1px 4px rgba(23,21,18,0.25)",
        ...style,
      }}
    />
  );
}

// ── Main TeeCanvas component ───────────────────────────────────────────
export function TeeCanvas({
  colorId,
  placements,
  selectedIndex,
  onSelect,
  onMove,
  onResize,
  onRotate,
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
  onResize?: (index: number, scale: number) => void;
  onRotate?: (index: number, rotation: number) => void;
  face?: "front" | "back";
  showGuidelines?: boolean;
  allow3DRotate?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // active interaction tracking
  type DragMode = "move" | "resize-br" | "resize-bl" | "resize-tr" | "resize-tl" | "rotate";
  const dragState = useRef<{
    mode: DragMode;
    index: number;
    pointerId: number;
    startX: number;   // clientX at drag start
    startY: number;   // clientY at drag start
    startCx: number;  // element center x% at drag start
    startCy: number;  // element center y% at drag start
    startW: number;   // element width% at drag start
    startRot: number; // element rotation at drag start
    elemCxPx: number; // element center in px at drag start (for rotation)
    elemCyPx: number;
  } | null>(null);

  // 3-D rotation
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const rotDrag = useRef<{ pointerId: number; startX: number; startY: number; baseY: number; baseX: number } | null>(null);

  // ── helper: get container rect ────────────────────────────────
  function getRect() {
    return containerRef.current?.getBoundingClientRect() ?? null;
  }

  // ── element pointer down ──────────────────────────────────────
  function startDrag(
    e: ReactPointerEvent<HTMLElement>,
    index: number,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(index);

    const rect = getRect();
    if (!rect) return;

    const p = placements[index];
    const cx = (p.x / 100) * rect.width;
    const cy = (p.y / 100) * rect.height;

    dragState.current = {
      mode,
      index,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startCx: p.x,
      startCy: p.y,
      startW: p.scale,
      startRot: p.rotation,
      elemCxPx: rect.left + cx,
      elemCyPx: rect.top + cy,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  // ── global pointer move ───────────────────────────────────────
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragState.current;
      if (!d || d.pointerId !== e.pointerId) return;

      const rect = getRect();
      if (!rect) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.mode === "move") {
        const nx = clamp(d.startCx + (dx / rect.width) * 100, 0, 100);
        const ny = clamp(d.startCy + (dy / rect.height) * 100, 0, 100);
        onMove(d.index, Math.round(nx * 10) / 10, Math.round(ny * 10) / 10);

      } else if (d.mode === "rotate") {
        // angle from element center to current pointer
        const angle = Math.atan2(
          e.clientY - d.elemCyPx,
          e.clientX - d.elemCxPx,
        );
        const startAngle = Math.atan2(
          d.startY - d.elemCyPx,
          d.startX - d.elemCxPx,
        );
        const delta = ((angle - startAngle) * 180) / Math.PI;
        const newRot = (d.startRot + delta + 360) % 360;
        // normalise to -180..+180
        const rot = newRot > 180 ? newRot - 360 : newRot;
        onRotate?.(d.index, Math.round(rot));

      } else {
        // resize: treat drag distance as change in half-width
        // corner dragged determines sign
        const sign = d.mode === "resize-br" || d.mode === "resize-tr" ? 1 : -1;
        const dragDist = Math.sqrt(dx * dx + dy * dy) * sign;
        const pct = (dragDist / rect.width) * 100 * 2; // *2 because we drag from corner
        const newW = clamp(d.startW + pct, MIN_SIZE_PCT, MAX_SIZE_PCT);
        onResize?.(d.index, Math.round(newW * 10) / 10);
      }
    },
    [onMove, onResize, onRotate],
  );

  // ── global pointer up ─────────────────────────────────────────
  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === e.pointerId) {
      dragState.current = null;
    }
  }, []);

  // ── 3-D rotation handlers (container, only when no sticker drag) ──
  function onContainerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current) return; // sticker drag active
    if (!allow3DRotate) return;
    rotDrag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseY: rotY, baseX: rotX };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSpinning(true);
  }

  function onContainerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current) { onPointerMove(e); return; }
    const d = rotDrag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setRotY(clamp(d.baseY + (e.clientX - d.startX) * 0.4, ROT_Y_MIN, ROT_Y_MAX));
    setRotX(clamp(d.baseX - (e.clientY - d.startY) * 0.22, ROT_X_MIN, ROT_X_MAX));
  }

  function onContainerUp(e: ReactPointerEvent<HTMLDivElement>) {
    onPointerUp(e);
    if (rotDrag.current?.pointerId === e.pointerId) {
      rotDrag.current = null;
      setSpinning(false);
      setRotY(0);
      setRotX(0);
    }
  }

  const Shell = face === "back" ? TeeShapeBack : TeeShape;

  return (
    <div
      ref={containerRef}
      className={cn("touch-none select-none", allow3DRotate && !dragState.current && "cursor-grab active:cursor-grabbing", className)}
      style={{ perspective: allow3DRotate ? "1000px" : undefined }}
      onPointerDown={onContainerDown}
      onPointerMove={onContainerMove}
      onPointerUp={onContainerUp}
      onPointerCancel={onContainerUp}
    >
      <div
        style={
          allow3DRotate
            ? {
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
                transition: spinning ? "none" : "transform 0.55s cubic-bezier(0.22,1,0.36,1)",
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

            const selected = index === selectedIndex;
            // placement.scale = width as % of container
            const w = clamp(placement.scale, MIN_SIZE_PCT, MAX_SIZE_PCT);

            const outer: React.CSSProperties = {
              position: "absolute",
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${w}%`,
              aspectRatio: "1",
              transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
              cursor: "grab",
              // selection outline
              outline: selected ? "2px solid #171512" : "none",
              outlineOffset: 3,
              borderRadius: 4,
              zIndex: selected ? 10 : 1,
            };

            // style override (bg shape/colour)
            const styleOv = placement.style;
            const hasBg = styleOv && styleOv.bgShape !== "none";
            const innerRadius =
              !hasBg && parsed.type === "builtin" ? "50%" :
              hasBg && styleOv.bgShape === "circle" ? "50%" :
              hasBg && styleOv.bgShape === "rounded" ? "20%" :
              "0";

            const innerStyle: React.CSSProperties = {
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10%",
              borderRadius: innerRadius,
              backgroundColor:
                hasBg ? styleOv.bgColor :
                parsed.type === "builtin" ? getSticker(parsed.id).bg :
                "transparent",
              boxShadow: (hasBg || parsed.type === "builtin")
                ? "inset 0 0 0 2px rgba(255,255,255,0.28), 0 8px 20px -6px rgba(23,21,18,0.3)"
                : undefined,
            };

            const handleSize = selected ? 14 : 0;

            return (
              <div
                key={`el-${index}`}
                style={outer}
                onPointerDown={(e) => startDrag(e, index, "move")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {/* ── Content ─────────────────────────────── */}
                <div style={innerStyle}>
                  {parsed.type === "image" ? (
                    <img
                      src={placement.ref}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                      draggable={false}
                    />
                  ) : (
                    <StickerArt sticker={getSticker(parsed.id)} />
                  )}
                </div>

                {/* ── PowerPoint-style handles (visible only when selected) ── */}
                {selected ? (
                  <>
                    {/* Rotation handle — top centre */}
                    <span
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "rotate"); }}
                      style={{
                        position: "absolute",
                        top: -28,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 14,
                        height: 14,
                        background: "#C8542F",
                        border: "2px solid #fff",
                        borderRadius: "50%",
                        cursor: "alias",
                        zIndex: 20,
                        boxShadow: "0 1px 4px rgba(23,21,18,0.3)",
                      }}
                    />
                    {/* Line from rotation handle to element */}
                    <span style={{
                      position: "absolute",
                      top: -16,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 1,
                      height: 16,
                      background: "rgba(23,21,18,0.3)",
                      pointerEvents: "none",
                    }} />

                    {/* Corner resize handles */}
                    <Handle cursor="nw-resize" style={{ top: 0, left: 0 }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-tl"); }} />
                    <Handle cursor="ne-resize" style={{ top: 0, left: "100%" }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-tr"); }} />
                    <Handle cursor="sw-resize" style={{ top: "100%", left: 0 }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-bl"); }} />
                    <Handle cursor="se-resize" style={{ top: "100%", left: "100%" }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-br"); }} />

                    {/* Edge midpoint handles */}
                    <Handle cursor="n-resize" style={{ top: 0, left: "50%" }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-tl"); }} />
                    <Handle cursor="s-resize" style={{ top: "100%", left: "50%" }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-br"); }} />
                    <Handle cursor="w-resize" style={{ top: "50%", left: 0 }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-bl"); }} />
                    <Handle cursor="e-resize" style={{ top: "50%", left: "100%" }}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, index, "resize-br"); }} />
                  </>
                ) : null}
              </div>
            );
          })}
        </Shell>
      </div>

      {allow3DRotate && placements.length === 0 && rotY === 0 && (
        <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] text-smoke/50">
          drag to rotate
        </p>
      )}
    </div>
  );
}
