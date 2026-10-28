import type { Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { STICKERS } from "@/lib/catalog";
import type { StickerId } from "@/lib/catalog";
import { firstRow } from "@/lib/db";

function generateStickerSvg(id: StickerId, fg: string, accent: string, bg: string): string {
  switch (id) {
    case "sun":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <circle cx="32" cy="33" r="13" fill="${fg}" />
        <g stroke="${fg}" stroke-width="2.6" stroke-linecap="round">
          <path d="M32 8v6"/><path d="M32 52v4"/><path d="M8 33h6"/><path d="M50 33h6"/>
          <path d="M15 16l4.2 4.2"/><path d="M44.8 45.8L49 50"/><path d="M49 16l-4.2 4.2"/><path d="M19.2 45.8L15 50"/>
        </g>
        <path d="M15 56h34" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" />
      </svg>`;

    case "wave":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <g fill="none" stroke-linecap="round" stroke-width="3.2">
          <path d="M8 22c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke="${fg}" />
          <path d="M8 32c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke="${accent}" />
          <path d="M8 42c5-5 11-5 16 0s11 5 16 0 11-5 16 0" stroke="${fg}" />
        </g>
      </svg>`;

    case "peak":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <circle cx="47" cy="17" r="5" fill="${accent}" />
        <path d="M6 48 23 18l10 17 7-11 18 24Z" fill="${fg}" />
        <path d="M17.5 29 23 18l4 7" stroke="${bg}" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <path d="M6 54h52" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" />
      </svg>`;

    case "palm":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <path d="M36 54c-2-8-3-16 0-24" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round" />
        <g fill="none" stroke="${fg}" stroke-width="2.8" stroke-linecap="round">
          <path d="M36 30c-8-7-15-7-22-3" />
          <path d="M36 30c-5-9-12-11-19-10" />
          <path d="M36 30c3-8 10-12 17-11" />
          <path d="M36 30c8-1 13 3 17 9" />
        </g>
        <path d="M20 54c9-3 22-3 30 0" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" />
      </svg>`;

    case "tape":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <rect x="7" y="18" width="50" height="31" rx="5" fill="none" stroke="${fg}" stroke-width="2.6" />
        <rect x="13" y="24" width="38" height="12" rx="2.5" fill="${accent}" />
        <circle cx="22" cy="43" r="4.5" fill="none" stroke="${fg}" stroke-width="2.2" />
        <circle cx="42" cy="43" r="4.5" fill="none" stroke="${fg}" stroke-width="2.2" />
        <path d="M26.5 43h11" stroke="${fg}" stroke-width="2.2" />
      </svg>`;

    case "bolt":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <circle cx="32" cy="32" r="22" fill="${accent}" opacity=".25" />
        <path d="M36 6 16 36h13l-4 22 22-32H34l2-20Z" fill="${fg}" />
      </svg>`;

    case "moon":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <circle cx="31" cy="33" r="15" fill="${fg}" />
        <circle cx="38" cy="27" r="14" fill="${bg}" />
        <path d="M50 13l1.8 4.2L56 19l-4.2 1.8L50 25l-1.8-4.2L44 19l4.2-1.8Z" fill="${accent}" />
        <circle cx="15" cy="16" r="1.8" fill="${accent}" />
        <circle cx="18" cy="49" r="1.5" fill="${accent}" />
      </svg>`;

    case "bloom":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <g fill="${fg}">
          <ellipse cx="32" cy="19" rx="6.2" ry="11" />
          <ellipse cx="32" cy="19" rx="6.2" ry="11" transform="rotate(60 32 32)" />
          <ellipse cx="32" cy="19" rx="6.2" ry="11" transform="rotate(120 32 32)" />
          <ellipse cx="32" cy="19" rx="6.2" ry="11" transform="rotate(180 32 32)" />
          <ellipse cx="32" cy="19" rx="6.2" ry="11" transform="rotate(240 32 32)" />
          <ellipse cx="32" cy="19" rx="6.2" ry="11" transform="rotate(300 32 32)" />
        </g>
        <circle cx="32" cy="32" r="5.6" fill="${accent}" />
      </svg>`;

    case "heart":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <path d="M32 53S11 41.5 11 26.5C11 19.6 16.4 15 22.6 15c4.1 0 7.4 2.1 9.4 5.3C34 17.1 37.3 15 41.4 15 47.6 15 53 19.6 53 26.5 53 41.5 32 53 32 53Z" fill="${fg}" />
        <path d="M20.5 24.5c0-2.6 2-4.5 4.6-4.5" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" fill="none" />
      </svg>`;

    case "eye":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <path d="M7 32s9.5-14 25-14 25 14 25 14-9.5 14-25 14S7 32 7 32Z" fill="none" stroke="${fg}" stroke-width="2.6" stroke-linejoin="round" />
        <circle cx="32" cy="32" r="8.5" fill="${fg}" />
        <circle cx="32" cy="32" r="3" fill="${accent}" />
        <path d="M32 9v5M10.5 22.5l4 3M53.5 22.5l-4 3" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" />
      </svg>`;

    case "smile":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <circle cx="32" cy="32" r="21" fill="none" stroke="${fg}" stroke-width="2.8" />
        <circle cx="24.5" cy="28" r="2.4" fill="${fg}" />
        <circle cx="39.5" cy="28" r="2.4" fill="${fg}" />
        <path d="M21.5 38c2.8 5 6.4 7.2 10.5 7.2s7.7-2.2 10.5-7.2" fill="none" stroke="${fg}" stroke-width="2.8" stroke-linecap="round" />
        <circle cx="16" cy="36" r="3" fill="${accent}" opacity=".45" />
        <circle cx="48" cy="36" r="3" fill="${accent}" opacity=".45" />
      </svg>`;

    case "star":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400">
        <path d="M32 7l7.1 15.6 17 2.3-12.5 11.9 3.2 16.9L32 45.6l-14.8 8.1 3.2-16.9L7.8 24.9l17-2.3Z" fill="${fg}" />
        <path d="M49 46l2 4.4 4.5 2-4.5 2-2 4.4-2-4.4-4.5-2 4.5-2Z" fill="${accent}" />
      </svg>`;

    case "ia_crown":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="400" height="400">
        <circle cx="40" cy="40" r="37" fill="none" stroke="${accent}" stroke-width="1.8" stroke-dasharray="3 3" />
        <circle cx="40" cy="40" r="33" fill="none" stroke="${fg}" stroke-width="2.2" />
        <path d="M26 31 L32 20 L40 27 L48 20 L54 31 Z" fill="${accent}" stroke="${fg}" stroke-width="1.6" stroke-linejoin="round" />
        <circle cx="32" cy="18" r="2" fill="${fg}" /><circle cx="40" cy="25" r="2" fill="${fg}" /><circle cx="48" cy="18" r="2" fill="${fg}" />
        <text x="40" y="52" text-anchor="middle" fill="${fg}" font-family="serif" font-weight="bold" font-size="18" letter-spacing="2">IA</text>
        <path d="M28 58 Q40 64 52 58" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
        <text x="40" y="68" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="5" font-weight="bold" letter-spacing="2">LEGACY</text>
      </svg>`;

    case "vintage_motor":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <g fill="${accent}" opacity=".85">
          <path d="M12 42 C 24 38, 36 44, 44 48 C 34 50, 22 52, 14 62 C 18 54, 24 50, 32 48 C 22 46, 16 44, 12 42 Z" />
          <path d="M88 42 C 76 38, 64 44, 56 48 C 66 50, 78 52, 86 62 C 82 54, 76 50, 68 48 C 78 46, 84 44, 88 42 Z" />
        </g>
        <path d="M42 36 L58 36 L64 48 L58 64 L42 64 L36 48 Z" fill="${fg}" />
        <rect x="44" y="40" width="12" height="4" fill="${accent}" />
        <rect x="44" y="48" width="12" height="4" fill="${accent}" />
        <rect x="44" y="56" width="12" height="4" fill="${accent}" />
        <line x1="32" y1="28" x2="68" y2="68" stroke="${fg}" stroke-width="3" stroke-linecap="round" />
        <line x1="68" y1="28" x2="32" y2="68" stroke="${fg}" stroke-width="3" stroke-linecap="round" />
        <polygon points="50,18 53,24 60,25 55,30 56,36 50,33 44,36 45,30 40,25 47,24" fill="${accent}" />
        <path d="M18 78 L50 72 L82 78 L78 86 L50 80 L22 86 Z" fill="${fg}" stroke="${accent}" stroke-width="1.5" />
        <text x="50" y="81" text-anchor="middle" fill="#FFFFFF" font-size="6.5" font-weight="900" font-family="sans-serif" letter-spacing="1.8">SPEED &amp; GLORY</text>
        <text x="50" y="94" text-anchor="middle" fill="${accent}" font-size="5.5" font-weight="bold" font-family="sans-serif" letter-spacing="3">HERITAGE CLUB</text>
      </svg>`;

    case "retro_sunset":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <defs>
          <clipPath id="sunset-clip-seed"><circle cx="50" cy="50" r="38" /></clipPath>
        </defs>
        <g clip-path="url(#sunset-clip-seed)">
          <circle cx="50" cy="50" r="36" fill="${accent}" />
          <rect x="10" y="44" width="80" height="2.5" fill="#171512" /><rect x="10" y="49" width="80" height="3" fill="#171512" /><rect x="10" y="55" width="80" height="4" fill="#171512" /><rect x="10" y="62" width="80" height="5" fill="#171512" /><rect x="10" y="70" width="80" height="6.5" fill="#171512" />
          <polygon points="20,70 42,48 58,62 76,46 95,70" fill="${fg}" opacity=".7" />
          <polygon points="10,80 32,56 48,70 65,54 90,80" fill="${fg}" />
          <path d="M26 80 Q29 60 38 52" stroke="#171512" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M38 52 Q26 44 20 48 M38 52 Q28 38 24 38 M38 52 Q38 38 42 36 M38 52 Q48 42 46 48" stroke="#171512" stroke-width="2.4" fill="none" stroke-linecap="round" />
          <path d="M74 80 Q71 62 62 55" stroke="#171512" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M62 55 Q74 47 80 51 M62 55 Q72 41 76 41 M62 55 Q62 41 58 39 M62 55 Q52 45 54 51" stroke="#171512" stroke-width="2.4" fill="none" stroke-linecap="round" />
        </g>
        <circle cx="50" cy="50" r="38" fill="none" stroke="${fg}" stroke-width="3" />
        <text x="50" y="96" text-anchor="middle" fill="${fg}" font-size="7" font-weight="900" font-family="sans-serif" letter-spacing="4">NEON 1984</text>
      </svg>`;

    case "tokyo_drift":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <rect x="22" y="12" width="56" height="76" rx="4" fill="none" stroke="${fg}" stroke-width="2.5" />
        <line x1="16" y1="28" x2="84" y2="28" stroke="${accent}" stroke-width="2" />
        <text x="50" y="44" text-anchor="middle" fill="${fg}" font-size="22" font-weight="900" font-family="sans-serif">速度</text>
        <path d="M30 68 L36 56 L64 56 L70 68 L68 74 L32 74 Z" fill="${accent}" stroke="${fg}" stroke-width="1.8" />
        <ellipse cx="40" cy="65" rx="3" ry="1.5" fill="#fff" /><ellipse cx="60" cy="65" rx="3" ry="1.5" fill="#fff" />
        <line x1="10" y1="58" x2="26" y2="58" stroke="${fg}" stroke-width="2" stroke-linecap="round" /><line x1="8" y1="64" x2="28" y2="64" stroke="${fg}" stroke-width="2" stroke-linecap="round" />
        <line x1="74" y1="58" x2="90" y2="58" stroke="${fg}" stroke-width="2" stroke-linecap="round" /><line x1="72" y1="64" x2="92" y2="64" stroke="${fg}" stroke-width="2" stroke-linecap="round" />
        <text x="50" y="24" text-anchor="middle" fill="${accent}" font-size="5.5" font-weight="900" letter-spacing="3">TOKYO DRIFT</text>
        <text x="50" y="82" text-anchor="middle" fill="${fg}" font-size="4.8" font-weight="bold" letter-spacing="2">UNDERGROUND RACING</text>
      </svg>`;

    case "botanical_wild":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <path d="M50 14 C 28 14, 16 32, 16 54 C 16 74, 32 86, 50 86 C 68 86, 84 74, 84 54" fill="none" stroke="${fg}" stroke-width="2.2" stroke-linecap="round" />
        <g fill="${fg}">
          <ellipse cx="22" cy="30" rx="3" ry="6" transform="rotate(-30 22 30)" />
          <ellipse cx="16" cy="45" rx="3" ry="6" transform="rotate(-10 16 45)" />
          <ellipse cx="18" cy="62" rx="3" ry="6" transform="rotate(25 18 62)" />
          <ellipse cx="28" cy="76" rx="3" ry="6" transform="rotate(50 28 76)" />
          <ellipse cx="42" cy="84" rx="3" ry="6" transform="rotate(75 42 84)" />
          <ellipse cx="60" cy="84" rx="3" ry="6" transform="rotate(-75 60 84)" />
          <ellipse cx="74" cy="76" rx="3" ry="6" transform="rotate(-50 74 76)" />
          <ellipse cx="82" cy="62" rx="3" ry="6" transform="rotate(-25 82 62)" />
        </g>
        <circle cx="50" cy="46" r="14" fill="${accent}" opacity=".9" />
        <path d="M50 36 C 45 42, 45 50, 50 56 C 55 50, 55 42, 50 36 Z" fill="#fff" opacity=".3" />
        <path d="M40 46 C 46 41, 54 41, 60 46 C 54 51, 46 51, 40 46 Z" fill="#fff" opacity=".3" />
        <circle cx="50" cy="46" r="4.5" fill="${fg}" />
        <path d="M50 16 C 54 20, 54 26, 50 30 C 47 26, 47 20, 50 16 Z" fill="${accent}" />
        <polygon points="50,6 51,9 54,10 51,11 50,14 49,11 46,10 49,9" fill="${accent}" />
        <text x="50" y="68" text-anchor="middle" fill="${fg}" font-size="6" font-weight="bold" font-family="serif" letter-spacing="3">FLORA &amp; FAUNA</text>
      </svg>`;

    case "skull_rose":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <g fill="${accent}"><circle cx="30" cy="30" r="14" /><circle cx="70" cy="30" r="14" /></g>
        <path d="M34 32 C 34 20, 66 20, 66 32 C 66 40, 62 44, 62 52 L58 54 L58 64 L42 64 L42 54 L38 52 C 38 44, 34 40, 34 32 Z" fill="${fg}" stroke="#171512" stroke-width="2" />
        <circle cx="43" cy="36" r="5" fill="#171512" /><circle cx="57" cy="36" r="5" fill="#171512" />
        <polygon points="50,44 47,50 53,50" fill="#171512" />
        <line x1="46" y1="56" x2="46" y2="62" stroke="#171512" stroke-width="1.8" />
        <line x1="50" y1="56" x2="50" y2="62" stroke="#171512" stroke-width="1.8" />
        <line x1="54" y1="56" x2="54" y2="62" stroke="#171512" stroke-width="1.8" />
        <path d="M34 26 Q50 32 66 26 L64 20 Q50 25 36 20 Z" fill="${accent}" />
        <path d="M26 72 Q50 66 74 72 Q50 78 26 72 Z" fill="${accent}" />
        <text x="50" y="86" text-anchor="middle" fill="${fg}" font-size="6" font-weight="900" font-family="sans-serif" letter-spacing="3">STAY WILD</text>
      </svg>`;

    case "cosmic_voyage":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
        <ellipse cx="50" cy="50" rx="44" ry="14" fill="none" stroke="${accent}" stroke-width="3" transform="rotate(-25 50 50)" />
        <circle cx="50" cy="50" r="26" fill="${fg}" stroke="#171512" stroke-width="2.5" />
        <path d="M34 42 C 34 34, 66 34, 66 42 C 66 58, 62 62, 50 62 C 38 62, 34 58, 34 42 Z" fill="${accent}" />
        <path d="M38 40 C 44 38, 54 38, 60 42 C 54 44, 44 44, 38 40 Z" fill="#fff" opacity=".6" />
        <rect x="38" y="72" width="24" height="8" rx="3" fill="${fg}" />
        <circle cx="22" cy="24" r="2" fill="${accent}" /><circle cx="78" cy="26" r="3" fill="${accent}" />
        <polygon points="50,10 52,15 57,17 52,19 50,24 48,19 43,17 48,15" fill="${accent}" />
        <text x="50" y="93" text-anchor="middle" fill="${fg}" font-size="6" font-weight="bold" font-family="monospace" letter-spacing="3">INFINITY VOYAGER</text>
      </svg>`;

    case "anime_warrior":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <g stroke="${accent}" stroke-width="1.6" opacity=".7">
          <line x1="60" y1="8" x2="60" y2="20" /><line x1="60" y1="100" x2="60" y2="112" /><line x1="8" y1="60" x2="20" y2="60" /><line x1="100" y1="60" x2="112" y2="60" />
          <line x1="22" y1="22" x2="32" y2="32" /><line x1="88" y1="88" x2="98" y2="98" /><line x1="22" y1="98" x2="32" y2="88" /><line x1="88" y1="22" x2="98" y2="32" />
        </g>
        <line x1="16" y1="104" x2="104" y2="16" stroke="${fg}" stroke-width="3.5" stroke-linecap="round" />
        <line x1="104" y1="104" x2="16" y2="16" stroke="${fg}" stroke-width="3.5" stroke-linecap="round" />
        <rect x="54" y="54" width="12" height="12" fill="${accent}" transform="rotate(45 60 60)" />
        <polygon points="60,16 68,36 84,24 82,42 98,38 88,54 94,66 78,64 74,80 60,70 46,80 42,64 26,66 32,54 22,38 38,42 36,24 52,36" fill="${fg}" />
        <rect x="42" y="44" width="36" height="8" rx="2" fill="${accent}" stroke="${fg}" stroke-width="1.5" />
        <circle cx="60" cy="48" r="2.5" fill="#fff" />
        <polygon points="46,56 54,58 52,60 46,58" fill="#fff" /><polygon points="74,56 66,58 68,60 74,58" fill="#fff" />
        <circle cx="50" cy="58" r="1.5" fill="${accent}" /><circle cx="70" cy="58" r="1.5" fill="${accent}" />
        <polygon points="44,66 60,82 76,66 60,72" fill="${accent}" stroke="${fg}" stroke-width="1.5" />
        <text x="60" y="104" text-anchor="middle" fill="${fg}" font-size="8" font-weight="900" font-family="sans-serif" letter-spacing="4">SHINOBI AURA</text>
      </svg>`;

    case "cyber_samurai":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <path d="M38 44 C 28 20, 20 12, 16 10 C 22 22, 30 36, 36 48 Z" fill="${accent}" stroke="${fg}" stroke-width="1.5" />
        <path d="M82 44 C 92 20, 100 12, 104 10 C 98 22, 90 36, 84 48 Z" fill="${accent}" stroke="${fg}" stroke-width="1.5" />
        <path d="M32 46 L60 28 L88 46 L82 56 L60 48 L38 56 Z" fill="${fg}" stroke="${accent}" stroke-width="2" />
        <rect x="36" y="52" width="48" height="12" rx="3" fill="${accent}" stroke="${fg}" stroke-width="2" />
        <line x1="40" y1="58" x2="80" y2="58" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="6 3" />
        <path d="M38 68 L60 92 L82 68 L78 84 L60 96 L42 84 Z" fill="${fg}" stroke="${accent}" stroke-width="1.5" />
        <polygon points="48,72 52,80 50,72" fill="#FFFFFF" /><polygon points="72,72 68,80 70,72" fill="#FFFFFF" />
        <path d="M22 68 L34 68 L38 76" stroke="${accent}" stroke-width="2" fill="none" />
        <path d="M98 68 L86 68 L82 76" stroke="${accent}" stroke-width="2" fill="none" />
        <circle cx="22" cy="68" r="2.5" fill="${accent}" /><circle cx="98" cy="68" r="2.5" fill="${accent}" />
        <text x="60" y="112" text-anchor="middle" fill="${fg}" font-size="8" font-weight="900" font-family="sans-serif" letter-spacing="4">CYBER ONI 2077</text>
      </svg>`;

    case "demon_slayer_fox":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <polygon points="34,48 24,18 50,34" fill="${fg}" stroke="${accent}" stroke-width="2" />
        <polygon points="86,48 96,18 70,34" fill="${fg}" stroke="${accent}" stroke-width="2" />
        <polygon points="34,42 28,24 46,34" fill="${accent}" /><polygon points="86,42 92,24 74,34" fill="${accent}" />
        <path d="M30 50 C 30 36, 90 36, 90 50 C 90 70, 78 88, 60 94 C 42 88, 30 70, 30 50 Z" fill="#FAFAF9" stroke="${fg}" stroke-width="2.5" />
        <path d="M38 52 C 44 46, 52 46, 56 50 C 50 54, 44 54, 38 52 Z" fill="${accent}" />
        <path d="M82 52 C 76 46, 68 46, 64 50 C 70 54, 76 54, 82 52 Z" fill="${accent}" />
        <ellipse cx="48" cy="51" rx="6" ry="1.8" fill="${fg}" /><ellipse cx="72" cy="51" rx="6" ry="1.8" fill="${fg}" />
        <polygon points="60,68 57,65 63,65" fill="${accent}" />
        <line x1="36" y1="64" x2="22" y2="60" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
        <line x1="36" y1="70" x2="20" y2="72" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
        <line x1="84" y1="64" x2="98" y2="60" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
        <line x1="84" y1="70" x2="100" y2="72" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
        <circle cx="60" cy="36" r="4.5" fill="${accent}" /><circle cx="60" cy="36" r="2" fill="#fff" />
        <text x="60" y="110" text-anchor="middle" fill="${fg}" font-size="8" font-weight="bold" font-family="serif" letter-spacing="4">KITSUNE SPIRIT</text>
      </svg>`;

    case "dragon_titan":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <path d="M60 16 C 90 16, 105 35, 88 54 C 68 70, 40 50, 32 72 C 22 92, 50 102, 70 96 C 88 90, 94 74, 88 68" fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" />
        <path d="M60 16 C 90 16, 105 35, 88 54 C 68 70, 40 50, 32 72 C 22 92, 50 102, 70 96 C 88 90, 94 74, 88 68" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="4 4" />
        <path d="M52 14 L68 12 L74 22 L66 26 L56 22 Z" fill="${fg}" stroke="${accent}" stroke-width="1.5" />
        <path d="M52 14 Q40 6 34 8" stroke="${accent}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M68 12 Q80 4 86 6" stroke="${accent}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M72 24 Q86 28 94 24" stroke="${fg}" stroke-width="1.8" fill="none" />
        <circle cx="64" cy="18" r="2" fill="${accent}" />
        <circle cx="60" cy="62" r="10" fill="${accent}" /><circle cx="60" cy="62" r="6" fill="#fff" opacity=".8" />
        <path d="M38 72 L30 68 M38 74 L28 75 M38 76 L32 82" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" />
        <text x="60" y="114" text-anchor="middle" fill="${fg}" font-size="8" font-weight="900" font-family="sans-serif" letter-spacing="5">RYŪ TITAN</text>
      </svg>`;

    case "manga_eyes":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <g stroke="${fg}" stroke-width="1.4" opacity=".6">
          <line x1="4" y1="20" x2="30" y2="40" /><line x1="6" y1="60" x2="28" y2="60" /><line x1="4" y1="100" x2="30" y2="80" />
          <line x1="116" y1="20" x2="90" y2="40" /><line x1="114" y1="60" x2="92" y2="60" /><line x1="116" y1="100" x2="90" y2="80" />
        </g>
        <rect x="14" y="38" width="92" height="44" fill="#09090B" rx="3" stroke="${fg}" stroke-width="2.5" />
        <path d="M22 56 Q36 46 52 56 Q36 64 22 56 Z" fill="#FFFFFF" />
        <circle cx="38" cy="56" r="7.5" fill="${accent}" /><circle cx="38" cy="56" r="4" fill="#000" /><circle cx="35" cy="53" r="2.2" fill="#fff" />
        <path d="M20 48 Q36 40 54 50" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M68 56 Q84 46 98 56 Q84 64 68 56 Z" fill="#FFFFFF" />
        <circle cx="82" cy="56" r="7.5" fill="${accent}" /><circle cx="82" cy="56" r="4" fill="#000" /><circle cx="79" cy="53" r="2.2" fill="#fff" />
        <path d="M66 50 Q84 40 100 48" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round" />
        <text x="60" y="32" text-anchor="middle" fill="${accent}" font-size="14" font-weight="900" font-family="sans-serif" letter-spacing="4">ゴゴゴ</text>
        <text x="60" y="104" text-anchor="middle" fill="${fg}" font-size="8" font-weight="900" font-family="sans-serif" letter-spacing="4">AWAKENED</text>
      </svg>`;

    case "phoenix_rebirth":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="400" height="400">
        <g fill="${accent}" stroke="${fg}" stroke-width="1.2">
          <path d="M60 52 C 44 26, 20 22, 10 28 C 18 40, 32 50, 48 58 Z" />
          <path d="M60 58 C 42 38, 22 36, 12 44 C 20 54, 34 62, 50 66 Z" />
          <path d="M60 64 C 44 48, 26 48, 16 58 C 26 66, 38 72, 54 74 Z" />
          <path d="M60 52 C 76 26, 100 22, 110 28 C 102 40, 88 50, 72 58 Z" />
          <path d="M60 58 C 78 38, 98 36, 108 44 C 100 54, 86 62, 70 66 Z" />
          <path d="M60 64 C 76 48, 94 48, 104 58 C 94 66, 82 72, 66 74 Z" />
        </g>
        <path d="M60 36 C 56 46, 54 62, 60 78 C 66 62, 64 46, 60 36 Z" fill="${fg}" />
        <circle cx="60" cy="30" r="5" fill="${fg}" />
        <polygon points="60,25 57,18 63,18" fill="${accent}" />
        <polygon points="60,22 54,14 60,18 66,14" fill="${accent}" />
        <path d="M60 78 Q50 96 42 108" stroke="${accent}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M60 78 Q60 98 60 110" stroke="${fg}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M60 78 Q70 96 78 108" stroke="${accent}" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <text x="60" y="118" text-anchor="middle" fill="${fg}" font-size="7.5" font-weight="900" font-family="serif" letter-spacing="4">ETERNAL PHOENIX</text>
      </svg>`;

    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400"><circle cx="32" cy="32" r="24" fill="${accent}"/></svg>`;
  }
}

export async function seedStickers(client: Client): Promise<void> {
  const countRow = await client.execute("SELECT COUNT(*) AS count FROM stickers");
  const count = Number(firstRow<{ count: number }>(countRow)?.count ?? 0);
  if (count > 0) return;

  for (let i = 0; i < STICKERS.length; i++) {
    const s = STICKERS[i];
    const svg = generateStickerSvg(s.id, s.fg, s.accent, s.bg);
    const imageId = randomUUID();
    const stickerId = randomUUID();
    const bytes = Buffer.from(svg, "utf-8");

    await client.execute({
      sql: `INSERT INTO product_images (id, mime, bytes, created_at, kind)
            VALUES (?, 'image/svg+xml', ?, ?, 'sticker')`,
      args: [imageId, bytes, Date.now()],
    });

    await client.execute({
      sql: `INSERT INTO stickers (id, name_en, name_ta, image_id, category, active, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [stickerId, s.nameEn, s.nameTa, imageId, s.category, i + 1, Date.now()],
    });
  }
}
