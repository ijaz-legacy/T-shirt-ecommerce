import type { ReactNode } from "react";
import { getTeeColor } from "@/lib/catalog";
import type { TeeColorId } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/**
 * Back-of-shirt SVG silhouette.
 * Same 400×460 viewBox as TeeShape (front) so placement coordinates are identical.
 * The back has no collar cutout — instead a round neck seam at the top,
 * and a center-back seam line running vertically.
 */
export function TeeShapeBack({
  colorId,
  className,
  children,
}: {
  colorId: TeeColorId;
  className?: string;
  children?: ReactNode;
}) {
  const color = getTeeColor(colorId);
  return (
    <div className={cn("relative aspect-[400/460]", className)}>
      {/* Ground shadow */}
      <div className="absolute bottom-[1%] left-1/2 h-[3%] w-[56%] -translate-x-1/2 rounded-[50%] bg-ink/15 blur-md" />
      <svg
        viewBox="0 0 400 460"
        className="relative h-full w-full drop-shadow-[0_22px_30px_rgba(23,21,18,0.16)]"
      >
        {/* Main body — same outline as front but with straight back neckline */}
        <path
          d="M149 36 C 155 28 245 28 251 36 L 294 46 L 366 120 L 338 196 L 300 180 L 308 432 Q 308 442 298 442 L 102 442 Q 92 442 92 432 L 100 180 L 62 196 L 34 120 L 106 46 Z"
          fill={color.hex}
          stroke="rgba(23,21,18,0.16)"
          strokeWidth="2"
        />
        {/* Right-side fold shadow */}
        <path
          d="M300 180 L 308 432 Q 308 442 298 442 L 282 442 L 292 180 Z"
          fill="rgba(23,21,18,0.06)"
        />
        {/* Left-side fold shadow */}
        <path
          d="M100 180 L 92 432 Q 92 442 102 442 L 118 442 L 108 180 Z"
          fill="rgba(23,21,18,0.05)"
        />
        {/* Right sleeve seam */}
        <path
          d="M294 46 L 339 122 L 326 178"
          fill="none"
          stroke="rgba(23,21,18,0.08)"
          strokeWidth="2"
        />
        {/* Left sleeve seam */}
        <path
          d="M106 46 L 61 122 L 74 178"
          fill="none"
          stroke="rgba(23,21,18,0.08)"
          strokeWidth="2"
        />
        {/* Right shoulder shadow */}
        <path
          d="M350 128 L 329 188"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="2"
        />
        {/* Left shoulder shadow */}
        <path
          d="M50 128 L 71 188"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="2"
        />
        {/* Hem stitch */}
        <path
          d="M97 423 Q 200 430 303 423"
          fill="none"
          stroke="rgba(23,21,18,0.12)"
          strokeWidth="1.6"
          strokeDasharray="4 5"
        />
        {/* Back neck binding — flatter arc */}
        <path
          d="M155 36 C 165 42 235 42 245 36"
          fill="none"
          stroke="rgba(23,21,18,0.22)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Neck binding highlight */}
        <path
          d="M160 38 C 170 43 230 43 240 38"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Center-back seam */}
        <path
          d="M200 46 L 200 432"
          fill="none"
          stroke="rgba(23,21,18,0.07)"
          strokeWidth="1.4"
          strokeDasharray="5 6"
        />
        {/* Back yoke stitch line */}
        <path
          d="M120 180 Q 200 188 280 180"
          fill="none"
          stroke="rgba(23,21,18,0.10)"
          strokeWidth="1.4"
          strokeDasharray="3 4"
        />
      </svg>
      {children}
    </div>
  );
}
