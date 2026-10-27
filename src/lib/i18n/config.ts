import type { Lang } from "@/lib/types";

export const LANG_COOKIE = "ijaz_lang";
export const LANGS: Lang[] = ["en", "ta"];

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "ta";
}
