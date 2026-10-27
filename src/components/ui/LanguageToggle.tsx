"use client";

import { cn } from "@/lib/cn";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Lang } from "@/lib/types";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ta", label: "தமிழ்" },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-paper p-1",
        className,
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLang(option.code)}
          aria-pressed={lang === option.code}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-semibold leading-none transition",
            lang === option.code
              ? "bg-ink text-paper"
              : "text-smoke hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
