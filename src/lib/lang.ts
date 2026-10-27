import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Lang } from "@/lib/types";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

export async function getDictionary() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
