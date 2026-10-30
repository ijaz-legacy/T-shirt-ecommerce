import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DesignGallery } from "@/components/user-designs/DesignGallery";
import { fill } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { requireUser } from "@/lib/session";
import { listUserDesigns } from "@/lib/user-designs";

export const metadata: Metadata = {
  title: "My Designs",
};

export default async function UserDesignsPage() {
  const user = await requireUser("/user-designs");
  const { t } = await getDictionary();
  const designs = (await listUserDesigns(user.id)).filter((design) => design.config);

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t.orders.eyebrow}</p>
            <h1 className="display-title mt-2 text-3xl sm:text-4xl">
              {t.custom.yourDesigns}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-smoke">
              {t.custom.yourDesignsHint}
            </p>
          </div>
          <Link
            href="/customize"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-ink/85"
          >
            {t.custom.newDesign}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-7 flex items-center justify-between border-b border-line pb-3">
          <p className="text-sm font-semibold">
            {t.custom.yourDesigns}
          </p>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-smoke">
            {fill(t.custom.designCount, { count: designs.length })}
          </span>
        </div>
        <DesignGallery designs={designs} />
      </div>
    </div>
  );
}
