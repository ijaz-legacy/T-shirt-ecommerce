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
  price: number;
  bg: string;
  fg: string;
  accent: string;
}

const STICKER_PRICE = 59;

export const STICKERS: Sticker[] = [
  { id: "sun", nameEn: "Sunrise", nameTa: "உதயம்", price: STICKER_PRICE, bg: "#F4C95D", fg: "#B8441F", accent: "#8F2F12" },
  { id: "wave", nameEn: "Waves", nameTa: "அலைகள்", price: STICKER_PRICE, bg: "#29465B", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "peak", nameEn: "Peaks", nameTa: "சிகரம்", price: STICKER_PRICE, bg: "#4E5A41", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "palm", nameEn: "Palmyra", nameTa: "பனை", price: STICKER_PRICE, bg: "#EAD8B7", fg: "#3F513E", accent: "#B8441F" },
  { id: "tape", nameEn: "Mixtape", nameTa: "கேசட்", price: STICKER_PRICE, bg: "#C8542F", fg: "#F7F2E9", accent: "#E9B44C" },
  { id: "bolt", nameEn: "Voltage", nameTa: "மின்னல்", price: STICKER_PRICE, bg: "#F7F2E9", fg: "#C8542F", accent: "#171512" },
  { id: "moon", nameEn: "Moonlight", nameTa: "நிலவு", price: STICKER_PRICE, bg: "#1C1B19", fg: "#E9B44C", accent: "#F7F2E9" },
  { id: "bloom", nameEn: "Bloom", nameTa: "பூக்கும்", price: STICKER_PRICE, bg: "#F0CBD2", fg: "#6C2E38", accent: "#E9B44C" },
  { id: "heart", nameEn: "Whole Heart", nameTa: "முழு இதயம்", price: STICKER_PRICE, bg: "#C8542F", fg: "#F7F2E9", accent: "#F0CBD2" },
  { id: "eye", nameEn: "Mystic Eye", nameTa: "மாயக் கண்", price: STICKER_PRICE, bg: "#EAD8B7", fg: "#26374F", accent: "#C8542F" },
  { id: "smile", nameEn: "Good Vibes", nameTa: "நல்ல உணர்வு", price: STICKER_PRICE, bg: "#E9B44C", fg: "#171512", accent: "#F7F2E9" },
  { id: "star", nameEn: "Star", nameTa: "நட்சத்திரம்", price: STICKER_PRICE, bg: "#26374F", fg: "#E9B44C", accent: "#C8542F" },
];

export const STICKER_MAP: Record<StickerId, Sticker> = Object.fromEntries(
  STICKERS.map((sticker) => [sticker.id, sticker]),
) as Record<StickerId, Sticker>;

export const MAX_STICKERS = 3;
export const MAX_QTY = 10;
export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

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

export function calcCustomUnitPrice(fit: FitId, stickerIds: readonly string[]): number {
  const base = getFit(fit).price;
  const stickers = stickerIds.reduce((sum, id) => {
    return sum + (isStickerId(id) ? getSticker(id).price : 0);
  }, 0);
  return base + stickers;
}

export function calcShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calcTotals(subtotal: number): { shippingFee: number; total: number } {
  const shippingFee = calcShipping(subtotal);
  return { shippingFee, total: subtotal + shippingFee };
}
