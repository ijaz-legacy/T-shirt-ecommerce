import { getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { TeeShapeBack } from "@/components/tee/TeeShapeBack";
import { StickerArt } from "@/components/tee/StickerArt";

const MIN_SIZE = 8;
const MAX_SIZE = 75;

export function TeePreview({
  colorId,
  placements,
  face = "front",
  className,
}: {
  colorId: TeeColorId;
  placements: StickerPlacement[];
  face?: "front" | "back";
  className?: string;
}) {
  const elements = placements.filter((p) =>
    face === "back" ? p.face === "back" : !p.face || p.face === "front",
  );
  const Shell = face === "back" ? TeeShapeBack : TeeShape;

  return (
    <Shell colorId={colorId} className={className}>
      {elements.map((placement, index) => {
        const parsed = parsePlacementRef(placement.ref);
        const isText = placement.ref.startsWith("text:");
        if (!parsed && !isText) return null;

        const w = Math.min(MAX_SIZE, Math.max(MIN_SIZE, placement.scale));
        const base: React.CSSProperties = {
          position: "absolute",
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          width: `${w}%`,
          aspectRatio: "1",
          transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
          pointerEvents: "none",
        };
        const key = `${placement.ref}-${placement.face ?? "front"}-${index}`;

        // ── Text placement ─────────────────────────────────────────────
        if (isText && placement.text) {
          const t = placement.text;
          const ff =
            t.fontFamily === "serif"   ? "'Instrument Serif', Georgia, serif" :
            t.fontFamily === "display" ? "'Bricolage Grotesque', sans-serif" :
            t.fontFamily === "mono"    ? "'Courier New', monospace" :
            "'DM Sans', sans-serif";
          return (
            <div key={key} style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{
                fontFamily: ff,
                color: t.color,
                fontWeight: t.bold ? 700 : 400,
                fontStyle: t.italic ? "italic" : "normal",
                fontSize: "clamp(8px, 18%, 48px)",
                textAlign: "center",
                lineHeight: 1.2,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {t.content}
              </span>
            </div>
          );
        }

        if (!parsed) return null;

        // Shared crop window: clips the sticker artwork to placement.style.crop
        const renderCroppable = (child: React.ReactNode) => {
          const crop = placement.style?.crop;
          if (!crop || (crop.w === 1 && crop.h === 1 && crop.x === 0 && crop.y === 0)) {
            return child;
          }
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: `${100 / crop.w}%`,
                  height: `${100 / crop.h}%`,
                  left: `${(-crop.x / crop.w) * 100}%`,
                  top: `${(-crop.y / crop.h) * 100}%`,
                }}
              >
                {child}
              </div>
            </div>
          );
        };

        // ── Uploaded image ─────────────────────────────────────────────
        if (parsed.type === "image") {
          const styleOv = placement.style;
          const bgShape = styleOv?.bgShape;
          const hasShapedBg = bgShape && bgShape !== "transparent" && bgShape !== "none";
          const bgColor = styleOv?.bgColor ?? "#FFFFFF";
          const borderRadius =
            bgShape === "circle"  ? "50%" :
            bgShape === "rounded" ? "20%" :
            bgShape === "square"  ? "0" : "0";

          if (hasShapedBg) {
            return (
              <div key={key} style={{ ...base, backgroundColor: bgColor, borderRadius, padding: "10%",
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.25), 0 6px 18px -5px rgba(23,21,18,.28)" }}>
                {renderCroppable(<img src={placement.ref} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />)}
              </div>
            );
          }
          return (
            <div key={key} style={base}>
              {renderCroppable(<img src={placement.ref} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />)}
            </div>
          );
        }

        // ── Built-in sticker ───────────────────────────────────────────
        if (parsed.type === "builtin") {
          const sticker = getSticker(parsed.id);
          const styleOv = placement.style;
          const bgShape = styleOv?.bgShape;
          const hasShapedBg = bgShape && bgShape !== "transparent" && bgShape !== "none";
          const bgColor = hasShapedBg ? (styleOv?.bgColor ?? sticker.bg) : "transparent";
          const borderRadius =
            bgShape === "circle"  ? "50%" :
            bgShape === "rounded" ? "20%" :
            bgShape === "square"  ? "4px" : "4px";
          const isFullyTransparent = !hasShapedBg;

          return (
            <div
              key={key}
              style={{
                ...base,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: bgColor,
                borderRadius,
                padding: isFullyTransparent ? "0" : "10%",
                boxShadow: isFullyTransparent ? undefined
                  : "inset 0 0 0 1.5px rgba(255,255,255,.25), 0 6px 18px -5px rgba(23,21,18,.28)",
              }}
            >
              {renderCroppable(
                <StickerArt
                  sticker={sticker}
                  fgOverride={styleOv?.fg}
                  accentOverride={styleOv?.accent}
                />,
              )}
            </div>
          );
        }

        return null;
      })}
    </Shell>
  );
}
