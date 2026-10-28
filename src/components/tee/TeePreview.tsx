import { BASE_PLACEMENT_SIZE, getSticker, parsePlacementRef } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { TeeShape } from "@/components/tee/TeeShape";
import { StickerArt } from "@/components/tee/StickerArt";

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
        const width = BASE_PLACEMENT_SIZE * placement.scale;
        const style: React.CSSProperties = {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          width: `${width}%`,
          transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
        };
        const key = `${placement.ref}-${index}`;

        if (parsed.type === "image") {
          return (
            <img
              key={key}
              src={placement.ref}
              alt=""
              className="pointer-events-none absolute aspect-square animate-pop-in object-contain transition-[left,top,width] duration-300 ease-out"
              style={style}
              draggable={false}
            />
          );
        }

        const sticker = getSticker(parsed.id);
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
          <div
            key={key}
            className="pointer-events-none absolute flex aspect-square animate-pop-in items-center justify-center p-[8%] transition-[left,top,width] duration-300 ease-out"
            style={{
              ...style,
              ...bgStyle,
              boxShadow:
                "inset 0 0 0 2px rgba(255,255,255,0.32), 0 10px 18px -8px rgba(23,21,18,0.35)",
            }}
          >
            <StickerArt sticker={sticker} />
          </div>
        );
      })}
    </TeeShape>
  );
}
