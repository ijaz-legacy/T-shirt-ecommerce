import { getSticker, getTeeColor } from "@/lib/catalog";
import type { StickerId, TeeColorId } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { StickerArt } from "@/components/tee/StickerArt";

const LAYOUTS: Record<
  number,
  { left: number; top: number; size: number }[]
> = {
  0: [],
  1: [{ left: 50, top: 39, size: 32 }],
  2: [
    { left: 39, top: 35, size: 26 },
    { left: 61, top: 47, size: 26 },
  ],
  3: [
    { left: 50, top: 33, size: 23 },
    { left: 35, top: 47, size: 22 },
    { left: 65, top: 47, size: 22 },
  ],
};

export function TeePreview({
  colorId,
  stickerIds,
  className,
}: {
  colorId: TeeColorId;
  stickerIds: StickerId[];
  className?: string;
}) {
  const color = getTeeColor(colorId);
  const stickers = stickerIds.slice(0, 3);
  const layout = LAYOUTS[stickers.length] ?? [];

  return (
    <div aria-hidden="true" className={cn("relative aspect-[400/460]", className)}>
      <div className="absolute bottom-[1%] left-1/2 h-[3%] w-[56%] -translate-x-1/2 rounded-[50%] bg-ink/15 blur-md" />
      <svg
        viewBox="0 0 400 460"
        className="relative h-full w-full drop-shadow-[0_22px_30px_rgba(23,21,18,0.16)]"
      >
        <path
          d="M149 36 C 170 62 230 62 251 36 L 294 46 L 366 120 L 338 196 L 300 180 L 308 432 Q 308 442 298 442 L 102 442 Q 92 442 92 432 L 100 180 L 62 196 L 34 120 L 106 46 Z"
          fill={color.hex}
          stroke="rgba(23,21,18,0.16)"
          strokeWidth="2"
        />
        <path
          d="M300 180 L 308 432 Q 308 442 298 442 L 282 442 L 292 180 Z"
          fill="rgba(23,21,18,0.06)"
        />
        <path
          d="M100 180 L 92 432 Q 92 442 102 442 L 118 442 L 108 180 Z"
          fill="rgba(23,21,18,0.05)"
        />
        <path
          d="M294 46 L 339 122 L 326 178"
          fill="none"
          stroke="rgba(23,21,18,0.08)"
          strokeWidth="2"
        />
        <path
          d="M106 46 L 61 122 L 74 178"
          fill="none"
          stroke="rgba(23,21,18,0.08)"
          strokeWidth="2"
        />
        <path
          d="M350 128 L 329 188"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="2"
        />
        <path
          d="M50 128 L 71 188"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="2"
        />
        <path
          d="M97 423 Q 200 430 303 423"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="1.6"
          strokeDasharray="4 5"
        />
        <path
          d="M149 36 C 170 62 230 62 251 36"
          fill="none"
          stroke="rgba(23,21,18,0.24)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M157 40 C 175 59 225 59 243 40"
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="186" y="44" width="28" height="9" rx="1" fill="rgba(23,21,18,0.08)" />
      </svg>

      {stickers.map((id, index) => {
        const sticker = getSticker(id);
        const spot = layout[index];
        if (!spot) return null;
        return (
          <div
            key={id}
            className="absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-[8%] transition-[left,top,width] duration-300 ease-out animate-pop-in"
            style={{
              left: `${spot.left}%`,
              top: `${spot.top}%`,
              width: `${spot.size}%`,
              backgroundColor: sticker.bg,
              boxShadow:
                "inset 0 0 0 2px rgba(255,255,255,0.32), 0 10px 18px -8px rgba(23,21,18,0.35)",
            }}
          >
            <StickerArt sticker={sticker} />
          </div>
        );
      })}
    </div>
  );
}
