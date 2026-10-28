import { getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { StickerArt } from "@/components/tee/StickerArt";

// placement.scale is now width-% of container (5–75)
const MIN_SIZE = 8;
const MAX_SIZE = 75;

export function TeePreview({
  colorId,
  placements,
  className,
}: {
  colorId: TeeColorId;
  placements: StickerPlacement[];
  className?: string;
}) {
  const elements = placements.slice(0, 3);

  return (
    <TeeShape colorId={colorId} className={className}>
      {elements.map((placement, index) => {
        const parsed = parsePlacementRef(placement.ref);
        if (!parsed) return null;

        const w = Math.min(MAX_SIZE, Math.max(MIN_SIZE, placement.scale));
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          width: `${w}%`,
          aspectRatio: "1",
          transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
          pointerEvents: "none",
        };
        const key = `${placement.ref}-${index}`;

        if (parsed.type === "image") {
          return (
            <img
              key={key}
              src={placement.ref}
              alt=""
              className="absolute aspect-square animate-pop-in object-contain"
              style={style}
              draggable={false}
            />
          );
        }

        const sticker = getSticker(parsed.id);
        const styleOv = placement.style;
        const hasBg = styleOv && styleOv.bgShape !== "none";
        const bgColor =
          hasBg ? styleOv.bgColor : sticker.bg;
        const borderRadius =
          hasBg && styleOv.bgShape === "circle" ? "50%" :
          hasBg && styleOv.bgShape === "rounded" ? "20%" :
          hasBg && styleOv.bgShape === "square" ? "0" :
          "50%";  // default circular for built-in stickers

        return (
          <div
            key={key}
            className="absolute flex animate-pop-in items-center justify-center"
            style={{
              ...style,
              backgroundColor: bgColor,
              borderRadius,
              padding: "10%",
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.28), 0 8px 20px -6px rgba(23,21,18,0.28)",
            }}
          >
            <StickerArt sticker={sticker} />
          </div>
        );
      })}
    </TeeShape>
  );
}
