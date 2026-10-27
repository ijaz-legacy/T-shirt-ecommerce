"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useT } from "@/components/providers/LanguageProvider";
import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <div className="container-page flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-rust/10 text-rust">
        <AlertTriangle size={24} />
      </span>
      <h1 className="display-title mt-5 text-3xl sm:text-5xl">
        {t.errorPage.title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-smoke sm:text-base">
        {t.errorPage.text}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass()}>
          <RotateCcw size={16} />
          {t.errorPage.retry}
        </button>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          <Home size={16} />
          {t.errorPage.home}
        </Link>
      </div>
    </div>
  );
}
