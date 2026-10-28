"use client";

/**
 * TeeCanvas — PowerPoint / Canva-style placement editor
 *
 * Sizing:
 *   placement.scale = element width as % of the canvas container (8–72).
 *   Internally we track the container's px width via ResizeObserver so
 *   stickers are always visibly sized regardless of the container size.
 *
 * Interactions:
 *   • Drag body    → move
 *   • Drag corner  → resize (square, aspect-ratio locked)
 *   • Drag red ◯   → free rotate
 *   • Click outside → deselect
 *   • Drag empty shirt area (when allow3DRotate) → 3-D tilt
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { TeeShapeBack } from "@/components/tee/TeeShapeBack";
import { StickerArt } from "@/components/tee/StickerArt";
import { cn } from "@/lib/cn";

// ── Constants ──────────────────────────────────────────────────────────
const MIN_W_PCT = 8;   // % of container — absolute floor
const MAX_W_PCT = 72;  // % of container — absolute ceiling
const MIN_W_PX  = 40;  // px — also enforced so stickers are always visible

// 3-D rotation limits
const ROT_Y_MIN = -40;
const ROT_Y_MAX = 40;
const ROT_X_MIN = -20;
const ROT_X_MAX = 20;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

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
        {face === "back" ? "Back" : "Front"} print area
      </span>
      <span className="absolute whitespace-nowrap rounded bg-gold/70 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-ink"
        style={{ left: "32%", top: "calc(42% - 15px)" }}>
        Safe zone
      </span>
    </div>
  );
}

// ── Corner/edge resize handle ──────────────────────────────────────────
function RHandle({
  top, left, cursor, onDown,
}: {
  top: number | string; left: number | string; cursor: string;
  onDown: (e: ReactPointerEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      onPointerDown={onDown}
      style={{
        position: "absolute",
        top,
        left,
        width: 13,
        height: 13,
        background: "#fff",
        border: "2px solid #171512",
        borderRadius: 3,
        cursor,
        transform: "translate(-50%,-50%)",
        boxShadow: "0 1px 5px rgba(0,0,0,.28)",
        zIndex: 30,
        touchAction: "none",
      }}
    />
  );
}

// ── TeeCanvas ──────────────────────────────────────────────────────────
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

  // Track container px width so stickers always render at visible sizes
  const [containerW, setContainerW] = useState(310);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerW(el.offsetWidth || 310);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Active interaction ref ─────────────────────────────────────────
  type Mode = "move" | "resize" | "rotate";
  const drag = useRef<{
    mode: Mode;
    index: number;
    pid: number;
    startCx: number; startCy: number;
    startW: number;
    startRot: number;
    startPx: number; startPy: number; // pointer px at start
    elCxPx: number;  elCyPx: number;  // element center in page-px
  } | null>(null);

  // ── 3-D rotation state ─────────────────────────────────────────────
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const rotDrag = useRef<{
    pid: number; sx: number; sy: number; by: number; bx: number;
  } | null>(null);

  // ── Sticker interaction start ──────────────────────────────────────
  function startInteract(
    e: ReactPointerEvent<HTMLElement>,
    index: number,
    mode: Mode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(index);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const p = placements[index];
    const elCxPx = rect.left + (p.x / 100) * rect.width;
    const elCyPx = rect.top  + (p.y / 100) * rect.height;

    drag.current = {
      mode, index, pid: e.pointerId,
      startCx: p.x, startCy: p.y,
      startW: p.scale, startRot: p.rotation,
      startPx: e.clientX, startPy: e.clientY,
      elCxPx, elCyPx,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  // ── Pointer move (attached to outer container) ─────────────────────
  const onMove_ = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;

    // 3-D rotation
    const rd = rotDrag.current;
    if (rd && rd.pid === e.pointerId && !d) {
      setRotY(clamp(rd.by + (e.clientX - rd.sx) * 0.4, ROT_Y_MIN, ROT_Y_MAX));
      setRotX(clamp(rd.bx - (e.clientY - rd.sy) * 0.22, ROT_X_MIN, ROT_X_MAX));
      return;
    }

    if (!d || d.pid !== e.pointerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;

    const dx = e.clientX - d.startPx;
    const dy = e.clientY - d.startPy;

    if (d.mode === "move") {
      onMove(
        d.index,
        Math.round(clamp(d.startCx + (dx / rect.width)  * 100, 0, 100) * 10) / 10,
        Math.round(clamp(d.startCy + (dy / rect.height) * 100, 0, 100) * 10) / 10,
      );
    } else if (d.mode === "resize") {
      // distance dragged → change in width (corner drag = *2 because symmetric)
      const dist = Math.hypot(dx, dy) * Math.sign(dx + dy);
      const deltaPct = (dist / rect.width) * 100 * 1.8;
      const raw = d.startW + deltaPct;
      // also enforce px floor
      const pxFloor = (MIN_W_PX / containerW) * 100;
      const newW = clamp(raw, Math.max(MIN_W_PCT, pxFloor), MAX_W_PCT);
      onResize?.(d.index, Math.round(newW * 10) / 10);
    } else if (d.mode === "rotate") {
      const angle = Math.atan2(e.clientY - d.elCyPx, e.clientX - d.elCxPx);
      const startAngle = Math.atan2(d.startPy - d.elCyPx, d.startPx - d.elCxPx);
      let rot = d.startRot + ((angle - startAngle) * 180) / Math.PI;
      if (rot > 180) rot -= 360;
      if (rot < -180) rot += 360;
      onRotate?.(d.index, Math.round(rot));
    }
  }, [onMove, onResize, onRotate, containerW]);

  const onUp_ = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pid === e.pointerId) drag.current = null;
    if (rotDrag.current?.pid === e.pointerId) {
      rotDrag.current = null;
      setSpinning(false);
      setRotY(0);
      setRotX(0);
    }
  }, []);

  // ── Container down → start 3-D rotation (if no active drag) ───────
  function onContainerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current) return;
    // deselect when clicking empty space
    onSelect(null);
    if (!allow3DRotate) return;
    rotDrag.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, by: rotY, bx: rotX };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSpinning(true);
  }

  const Shell = face === "back" ? TeeShapeBack : TeeShape;

  return (
    <div
      ref={containerRef}
      className={cn("touch-none select-none", allow3DRotate && "cursor-grab", className)}
      style={{ perspective: allow3DRotate ? "1000px" : undefined }}
      onPointerDown={onContainerDown}
      onPointerMove={onMove_}
      onPointerUp={onUp_}
      onPointerCancel={onUp_}
    >
      {/* 3-D tilt wrapper */}
      <div style={allow3DRotate ? {
        transformStyle: "preserve-3d",
        transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
        transition: spinning ? "none" : "transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        willChange: "transform",
      } : undefined}>
        <Shell colorId={colorId}>
          {showGuidelines && <GuidelinesOverlay face={face} />}

          {placements.map((placement, index) => {
            const parsed = parsePlacementRef(placement.ref);
            // handle text placements
            const isText = placement.ref.startsWith("text:");
            if (!parsed && !isText) return null;

            const selected = index === selectedIndex;

            // ── Compute width: use the larger of px-floor and pct value ──
            const pxFloor = (MIN_W_PX / containerW) * 100;
            const w = clamp(
              Math.max(placement.scale, pxFloor),
              MIN_W_PCT,
              MAX_W_PCT,
            );

            const outerStyle: React.CSSProperties = {
              position: "absolute",
              left: `${placement.x}%`,
              top:  `${placement.y}%`,
              width: `${w}%`,
              aspectRatio: "1",
              transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
              cursor: "grab",
              zIndex: selected ? 20 : 2,
              // selection outline only — no background here
              outline: selected ? "2px solid rgba(23,21,18,0.85)" : "none",
              outlineOffset: 2,
              borderRadius: 4,
            };

            // ── Style overrides ─────────────────────────────────────────
            const styleOv = placement.style;
            const bgShape = styleOv?.bgShape ?? "none";
            const bgColor = styleOv?.bgColor ?? "#FFFFFF";

            // Default: all placements (builtins + images) render with a
            // transparent background unless the user explicitly set a shape.
            const isTransparent = bgShape === "transparent" || bgShape === "none";

            const innerRadius =
              bgShape === "circle"  ? "50%" :
              bgShape === "rounded" ? "20%" :
              bgShape === "square"  ? "4px" : "4px";

            const innerBg = isTransparent ? "transparent" : bgColor;

            const innerStyle: React.CSSProperties = {
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // no padding when fully transparent (SVG art fills the element)
              padding: isTransparent ? "0" : "10%",
              borderRadius: innerRadius,
              backgroundColor: innerBg,
              boxShadow:
                !isTransparent
                  ? "inset 0 0 0 1.5px rgba(255,255,255,0.25), 0 6px 18px -5px rgba(23,21,18,0.28)"
                  : undefined,
            };

            // ── Handles (only when selected) ────────────────────────────
            const handles = selected ? (
              <>
                {/* Rotation handle */}
                <span
                  onPointerDown={(e) => { e.stopPropagation(); startInteract(e, index, "rotate"); }}
                  style={{
                    position: "absolute",
                    top: -26, left: "50%",
                    transform: "translateX(-50%)",
                    width: 14, height: 14,
                    background: "#C8542F",
                    border: "2.5px solid #fff",
                    borderRadius: "50%",
                    cursor: "alias",
                    zIndex: 40,
                    boxShadow: "0 2px 6px rgba(200,84,47,.45)",
                    touchAction: "none",
                  }}
                />
                {/* Connector line */}
                <span style={{
                  position: "absolute", top: -14, left: "50%",
                  transform: "translateX(-50%)",
                  width: 1, height: 14,
                  background: "rgba(23,21,18,.35)",
                  pointerEvents: "none",
                }} />
                {/* 4 corners */}
                <RHandle top={0}     left={0}     cursor="nw-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top={0}     left="100%"  cursor="ne-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top="100%" left={0}     cursor="sw-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top="100%" left="100%"  cursor="se-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                {/* 4 edges */}
                <RHandle top={0}     left="50%"   cursor="n-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top="100%" left="50%"   cursor="s-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top="50%"  left={0}     cursor="w-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
                <RHandle top="50%"  left="100%"  cursor="e-resize"
                  onDown={(e) => { e.stopPropagation(); startInteract(e, index, "resize"); }} />
              </>
            ) : null;

            // ── Text placement ─────────────────────────────────────────
            if (isText && placement.text) {
              const t = placement.text;
              const fontFamily =
                t.fontFamily === "serif"   ? "'Instrument Serif', Georgia, serif" :
                t.fontFamily === "display" ? "'Bricolage Grotesque', sans-serif" :
                t.fontFamily === "mono"    ? "'Courier New', monospace" :
                "'DM Sans', sans-serif";
              return (
                <div
                  key={`el-${index}`}
                  style={outerStyle}
                  onPointerDown={(e) => startInteract(e, index, "move")}
                  onPointerMove={onMove_}
                  onPointerUp={onUp_}
                >
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: !isTransparent ? bgColor : "transparent",
                    borderRadius: innerRadius,
                  }}>
                    <span style={{
                      fontFamily,
                      color: t.color,
                      fontWeight: t.bold ? 700 : 400,
                      fontStyle: t.italic ? "italic" : "normal",
                      fontSize: "clamp(8px, 18%, 48px)",
                      textAlign: "center",
                      lineHeight: 1.2,
                      padding: "4%",
                      wordBreak: "break-word",
                      pointerEvents: "none",
                      userSelect: "none",
                      whiteSpace: "pre-wrap",
                      textShadow: "0 1px 3px rgba(0,0,0,.12)",
                    }}>
                      {t.content}
                    </span>
                  </div>
                  {handles}
                </div>
              );
            }

            if (!parsed) return null;

            return (
              <div
                key={`el-${index}`}
                style={outerStyle}
                onPointerDown={(e) => startInteract(e, index, "move")}
                onPointerMove={onMove_}
                onPointerUp={onUp_}
              >
                <div style={innerStyle}>
                  {parsed.type === "image" ? (
                    <img
                      src={placement.ref}
                      alt=""
                      style={{
                        width: "100%", height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                        display: "block",
                      }}
                      draggable={false}
                    />
                  ) : (
                    <StickerArt
                      sticker={getSticker(parsed.id)}
                      fgOverride={styleOv?.fg}
                      accentOverride={styleOv?.accent}
                    />
                  )}
                </div>
                {handles}
              </div>
            );
          })}
        </Shell>
      </div>

      {allow3DRotate && placements.length === 0 && (
        <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] text-smoke/50">
          drag shirt to rotate
        </p>
      )}
    </div>
  );
}
