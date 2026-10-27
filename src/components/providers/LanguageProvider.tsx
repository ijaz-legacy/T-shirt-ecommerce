"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionary";
import type { Lang } from "@/lib/types";

interface LanguageContextValue {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      setLangState(next);
      document.documentElement.lang = next;
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [lang, router],
  );

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "ta" : "en");
  }, [lang, setLang]);

  const value = useMemo(
    () => ({ lang, t: dictionaries[lang], setLang, toggle }),
    [lang, setLang, toggle],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return value;
}

export function useT(): Dictionary {
  return useLanguage().t;
}
