"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import type { Lang } from "@/lib/types";

export function AppProviders({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  return (
    <LanguageProvider initialLang={initialLang}>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
