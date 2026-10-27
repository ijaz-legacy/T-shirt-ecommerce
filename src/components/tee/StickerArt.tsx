import type { Sticker } from "@/lib/catalog";
import { cn } from "@/lib/cn";

export function StickerArt({
  sticker,
  className,
}: {
  sticker: Sticker;
  className?: string;
}) {
  const { fg, accent, bg } = sticker;
  const base = cn("h-full w-full", className);

  switch (sticker.id) {
    case "sun":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <circle cx="32" cy="33" r="13" fill={fg} />
          <g stroke={fg} strokeWidth="2.6" strokeLinecap="round">
            <path d="M32 8v6" />
            <path d="M32 52v4" />
            <path d="M8 33h6" />
            <path d="M50 33h6" />
            <path d="M15 16l4.2 4.2" />
            <path d="M44.8 45.8L49 50" />
            <path d="M49 16l-4.2 4.2" />
            <path d="M19.2 45.8L15 50" />
          </g>
          <path d="M15 56h34" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <g fill="none" strokeLinecap="round" strokeWidth="3.2">
            <path d="M8 22c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke={fg} />
            <path d="M8 32c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke={accent} />
            <path d="M8 42c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke={fg} />
          </g>
        </svg>
      );
    case "peak":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <circle cx="47" cy="17" r="5" fill={accent} />
          <path d="M6 48 23 18l10 17 7-11 18 24Z" fill={fg} />
          <path
            d="M17.5 29 23 18l4 7"
            stroke={bg}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M6 54h52" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "palm":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <path
            d="M36 54c-2-8-3-16 0-24"
            stroke={fg}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <g fill="none" stroke={fg} strokeWidth="2.8" strokeLinecap="round">
            <path d="M36 30c-8-7-15-7-22-3" />
            <path d="M36 30c-5-9-12-11-19-10" />
            <path d="M36 30c3-8 10-12 17-11" />
            <path d="M36 30c8-1 13 3 17 9" />
          </g>
          <path d="M20 54c9-3 22-3 30 0" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case "tape":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <rect
            x="7"
            y="18"
            width="50"
            height="31"
            rx="5"
            fill="none"
            stroke={fg}
            strokeWidth="2.6"
          />
          <rect x="13" y="24" width="38" height="12" rx="2.5" fill={accent} />
          <circle cx="22" cy="43" r="4.5" fill="none" stroke={fg} strokeWidth="2.2" />
          <circle cx="42" cy="43" r="4.5" fill="none" stroke={fg} strokeWidth="2.2" />
          <path d="M26.5 43h11" stroke={fg} strokeWidth="2.2" />
          <path d="M18 18v6M46 18v6" stroke={fg} strokeWidth="2.2" opacity=".6" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <circle cx="32" cy="32" r="22" fill={accent} opacity=".18" />
          <path d="M36 6 16 36h13l-4 22 22-32H34l2-20Z" fill={fg} />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <circle cx="31" cy="33" r="15" fill={fg} />
          <circle cx="38" cy="27" r="14" fill={bg} />
          <path
            d="M50 13l1.8 4.2L56 19l-4.2 1.8L50 25l-1.8-4.2L44 19l4.2-1.8Z"
            fill={accent}
          />
          <circle cx="15" cy="16" r="1.8" fill={accent} />
          <circle cx="18" cy="49" r="1.5" fill={accent} />
        </svg>
      );
    case "bloom":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <g fill={fg}>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <ellipse
                key={angle}
                cx="32"
                cy="19"
                rx="6.2"
                ry="11"
                transform={`rotate(${angle} 32 32)`}
              />
            ))}
          </g>
          <circle cx="32" cy="32" r="5.6" fill={accent} />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <path
            d="M32 53S11 41.5 11 26.5C11 19.6 16.4 15 22.6 15c4.1 0 7.4 2.1 9.4 5.3C34 17.1 37.3 15 41.4 15 47.6 15 53 19.6 53 26.5 53 41.5 32 53 32 53Z"
            fill={fg}
          />
          <path
            d="M20.5 24.5c0-2.6 2-4.5 4.6-4.5"
            stroke={accent}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "eye":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <path
            d="M7 32s9.5-14 25-14 25 14 25 14-9.5 14-25 14S7 32 7 32Z"
            fill="none"
            stroke={fg}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="8.5" fill={fg} />
          <circle cx="32" cy="32" r="3" fill={accent} />
          <path
            d="M32 9v5M10.5 22.5l4 3M53.5 22.5l-4 3"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "smile":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <circle cx="32" cy="32" r="21" fill="none" stroke={fg} strokeWidth="2.8" />
          <circle cx="24.5" cy="28" r="2.4" fill={fg} />
          <circle cx="39.5" cy="28" r="2.4" fill={fg} />
          <path
            d="M21.5 38c2.8 5 6.4 7.2 10.5 7.2s7.7-2.2 10.5-7.2"
            fill="none"
            stroke={fg}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="16" cy="36" r="3" fill={accent} opacity=".45" />
          <circle cx="48" cy="36" r="3" fill={accent} opacity=".45" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={base}>
          <path
            d="M32 7l7.1 15.6 17 2.3-12.5 11.9 3.2 16.9L32 45.6l-14.8 8.1 3.2-16.9L7.8 24.9l17-2.3Z"
            fill={fg}
          />
          <path
            d="M49 46l2 4.4 4.5 2-4.5 2-2 4.4-2-4.4-4.5-2 4.5-2Z"
            fill={accent}
          />
        </svg>
      );
    default:
      return null;
  }
}
