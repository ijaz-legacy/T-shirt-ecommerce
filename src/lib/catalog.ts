import type { StickerPlacement } from "@/lib/types";

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const FIT_IDS = ["regular", "oversized"] as const;
export type FitId = (typeof FIT_IDS)[number];

export interface FitOption {
  id: FitId;
  nameEn: string;
  nameTa: string;
  descEn: string;
  descTa: string;
  price: number;
}

export const FITS: FitOption[] = [
  {
    id: "regular",
    nameEn: "Regular fit",
    nameTa: "ரெகுலர் ஃபிட்",
    descEn: "Easy, everyday shape",
    descTa: "தினசரி அணிய ஏற்ற வழவழப்பான ஃபிட்",
    price: 649,
  },
  {
    id: "oversized",
    nameEn: "Oversized fit",
    nameTa: "ஓவர்சைஸ்டு ஃபிட்",
    descEn: "Roomy, relaxed drop-shoulder",
    descTa: "தாராளமான, ரிலாக்ஸ்டு டிராப்-ஷோல்டர்",
    price: 699,
  },
];

export const FIT_MAP: Record<FitId, FitOption> = Object.fromEntries(
  FITS.map((fit) => [fit.id, fit]),
) as Record<FitId, FitOption>;

export const TEE_COLOR_IDS = [
  "cream",
  "white",
  "black",
  "sand",
  "olive",
  "navy",
  "maroon",
  "sky",
] as const;
export type TeeColorId = (typeof TEE_COLOR_IDS)[number];

export interface TeeColor {
  id: TeeColorId;
  hex: string;
  nameEn: string;
  nameTa: string;
  tone: "light" | "dark";
}

export const TEE_COLORS: TeeColor[] = [
  { id: "cream", hex: "#F2E8D5", nameEn: "Cream", nameTa: "கிரீம்", tone: "light" },
  { id: "white", hex: "#FFFFFF", nameEn: "White", nameTa: "வெள்ளை", tone: "light" },
  { id: "black", hex: "#1C1B19", nameEn: "Black", nameTa: "கருப்பு", tone: "dark" },
  { id: "sand", hex: "#D8C2A4", nameEn: "Sand", nameTa: "சாண்ட்", tone: "light" },
  { id: "olive", hex: "#5A6349", nameEn: "Olive", nameTa: "ஆலிவ்", tone: "dark" },
  { id: "navy", hex: "#26374F", nameEn: "Navy", nameTa: "நேவி", tone: "dark" },
  { id: "maroon", hex: "#6C2E38", nameEn: "Maroon", nameTa: "மெரூன்", tone: "dark" },
  { id: "sky", hex: "#A9C3D6", nameEn: "Sky", nameTa: "ஸ்கை", tone: "light" },
];

export const TEE_COLOR_MAP: Record<TeeColorId, TeeColor> = Object.fromEntries(
  TEE_COLORS.map((color) => [color.id, color]),
) as Record<TeeColorId, TeeColor>;

export const STICKER_IDS = [
  "sun",
  "wave",
  "peak",
  "palm",
  "tape",
  "bolt",
  "moon",
  "bloom",
  "heart",
  "eye",
  "smile",
  "star",
] as const;
export type StickerId = (typeof STICKER_IDS)[number];

export interface Sticker {
  id: StickerId;
  nameEn: string;
  nameTa: string;
  bg: string;
  fg: string;
  accent: string;
}

export const STICKERS: Sticker[] = [
  { id: "sun", nameEn: "Sunrise", nameTa: "உதயம்", bg: "#F4C95D", fg: "#B8441F", accent: "#8F2F12" },
  { id: "wave", nameEn: "Waves", nameTa: "அலைகள்", bg: "#29465B", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "peak", nameEn: "Peaks", nameTa: "சிகரம்", bg: "#4E5A41", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "palm", nameEn: "Palmyra", nameTa: "பனை", bg: "#EAD8B7", fg: "#3F513E", accent: "#B8441F" },
  { id: "tape", nameEn: "Mixtape", nameTa: "கேசட்", bg: "#C8542F", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "bolt", nameEn: "Voltage", nameTa: "மின்னல்", bg: "#F7F2E9", fg: "#C8542F", accent: "#171512" },
  { id: "moon", nameEn: "Moonlight", nameTa: "நிலவு", bg: "#1C1B19", fg: "#E9B44C", accent: "#F7F2E9" },
  { id: "bloom", nameEn: "Bloom", nameTa: "பூக்கும்", bg: "#F0CBD2", fg: "#6C2E38", accent: "#E9B44C" },
  { id: "heart", nameEn: "Whole Heart", nameTa: "முழு இதயம்", bg: "#C8542F", fg: "#F7F2E9", accent: "#F0CBD2" },
  { id: "eye", nameEn: "Mystic Eye", nameTa: "மாயக் கண்", bg: "#EAD8B7", fg: "#26374F", accent: "#C8542F" },
  { id: "smile", nameEn: "Good Vibes", nameTa: "நல்ல உணர்வு", bg: "#E9B44C", fg: "#171512", accent: "#F7F2E9" },
  { id: "star", nameEn: "Star", nameTa: "நட்சத்திரம்", bg: "#26374F", fg: "#E9B44C", accent: "#C8542F" },
];

export const STICKER_MAP: Record<StickerId, Sticker> = Object.fromEntries(
  STICKERS.map((sticker) => [sticker.id, sticker]),
) as Record<StickerId, Sticker>;

export const MAX_PLACEMENTS = 10;
export const MAX_QTY = 10;
export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export const CUSTOM_PRICE_HALF = 59;
export const CUSTOM_PRICE_FULL = 100;
export const FULL_SCALE_THRESHOLD = 0.6;
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 100;
export const MIN_ROTATION = -180;
export const MAX_ROTATION = 180;
export const BASE_PLACEMENT_SIZE = 32;

// ── Sticker size categories ───────────────────────────────────────────
// "small"  — logos / icons: max 200 × 200 px output
// "medium" — names / half-sheet: max 400 × 400 px output
// "large"  — full A4 sheet: max 800 × 800 px output
export const STICKER_CATEGORIES = ["small", "medium", "large"] as const;
export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

/** Max canvas scale for each category when placed on the tee */
export const CATEGORY_MAX_SCALE: Record<StickerCategory, number> = {
  small: 0.45,   // ~logo size
  medium: 0.72,  // ~half-sheet / name
  large: 1.0,    // full sheet
};
/** Default scale when a sticker of this category is first placed */
export const CATEGORY_DEFAULT_SCALE: Record<StickerCategory, number> = {
  small: 0.35,
  medium: 0.55,
  large: 0.85,
};
/** Max pixel dimensions when processing uploaded custom images by category */
export const CATEGORY_UPLOAD_SIZE: Record<StickerCategory, number> = {
  small: 200,
  medium: 400,
  large: 800,
};

export function isStickerCategory(value: unknown): value is StickerCategory {
  return (
    typeof value === "string" &&
    (STICKER_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function isFitId(value: unknown): value is FitId {
  return typeof value === "string" && (FIT_IDS as readonly string[]).includes(value);
}

export function isTeeColorId(value: unknown): value is TeeColorId {
  return typeof value === "string" && (TEE_COLOR_IDS as readonly string[]).includes(value);
}

export function isStickerId(value: unknown): value is StickerId {
  return typeof value === "string" && (STICKER_IDS as readonly string[]).includes(value);
}

export function getFit(id: FitId): FitOption {
  return FIT_MAP[id];
}

export function getTeeColor(id: TeeColorId): TeeColor {
  return TEE_COLOR_MAP[id];
}

export function getSticker(id: StickerId): Sticker {
  return STICKER_MAP[id];
}

export function priceForScale(scale: number): number {
  if (scale > 1) {
    return scale >= 40 ? CUSTOM_PRICE_FULL : CUSTOM_PRICE_HALF;
  }
  return scale >= FULL_SCALE_THRESHOLD ? CUSTOM_PRICE_FULL : CUSTOM_PRICE_HALF;
}

export function calcCustomUnitPrice(fit: FitId, scales: readonly number[]): number {
  const base = getFit(fit).price;
  return scales.reduce((sum, scale) => sum + priceForScale(scale), base);
}

export type PlacementRef =
  | { type: "builtin"; id: StickerId }
  | { type: "image"; id: string }
  | { type: "text"; id: string };

export function parsePlacementRef(ref: string): PlacementRef | null {
  if (ref.startsWith("builtin:")) {
    const id = ref.slice("builtin:".length);
    return isStickerId(id) ? { type: "builtin", id } : null;
  }
  if (ref.startsWith("text:")) {
    const id = ref.slice("text:".length);
    return { type: "text", id };
  }
  const match = /^\/api\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(
    ref,
  );
  return match ? { type: "image", id: match[1] } : null;
}

export function imageRef(id: string): string {
  return `/api/images/${id}`;
}

const PREVIEW_LAYOUTS: Record<number, { left: number; top: number; size: number }[]> = {
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

export function previewPlacements(ids: readonly StickerId[]): StickerPlacement[] {
  const layout = PREVIEW_LAYOUTS[Math.min(ids.length, 3)] ?? [];
  return ids.slice(0, 3).map((id, index) => {
    const spot = layout[index];
    return {
      ref: `builtin:${id}`,
      x: spot.left,
      y: spot.top,
      scale: spot.size / BASE_PLACEMENT_SIZE,
      rotation: 0,
    };
  });
}

export function calcShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calcTotals(subtotal: number): { shippingFee: number; total: number } {
  const shippingFee = calcShipping(subtotal);
  return { shippingFee, total: subtotal + shippingFee };
}
