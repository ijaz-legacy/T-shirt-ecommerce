import type { ReactNode } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { TeePreview } from "@/components/tee/TeePreview";
import { previewPlacements } from "@/lib/catalog";
import { getDictionary } from "@/lib/lang";

export async function AuthShell({ children }: { children: ReactNode }) {
  const { t } = await getDictionary();

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-paper shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-8 text-paper lg:flex">
          <span className="dot-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
          <div className="relative">
            <Image
              src="/brand/logo-full.webp"
              alt="IJAZ LEGACY"
              width={180}
              height={180}
              className="h-auto w-[150px] mix-blend-screen"
            />
            <p className="mt-4 font-display text-[22px] font-bold leading-snug tracking-[-0.02em]">
              {t.auth.loginQuote}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-paper/50">
              {t.auth.loginQuoteSmall}
            </p>
          </div>

          <div className="relative mx-auto my-8 w-[190px]">
            <TeePreview
              colorId="sand"
              placements={previewPlacements(["sun", "wave", "heart"])}
            />
          </div>

          <ul className="relative space-y-2.5 text-xs text-paper/60">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-gold" />
              {t.home.trustCod}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-gold" />
              {t.home.trustCotton}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-gold" />
              {t.home.trustMade}
            </li>
          </ul>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
