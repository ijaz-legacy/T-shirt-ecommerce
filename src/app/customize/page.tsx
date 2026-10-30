import type { Metadata } from "next";
import { CustomStudio } from "@/components/custom/CustomStudio";
import { getDictionary } from "@/lib/lang";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.nav.customize,
    description: t.custom.subtitle,
  };
}

export default async function CustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string | string[] }>;
}) {
  const params = await searchParams;
  const designId = Array.isArray(params.design) ? params.design[0] : params.design;
  await requireUser(designId ? `/customize?design=${encodeURIComponent(designId)}` : "/customize");
  const { t } = await getDictionary();

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">{t.custom.eyebrow}</p>
        <h1 className="display-title mt-2 text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">
          {t.custom.titleA}
          <br />
          <span className="accent-serif">{t.custom.titleB}</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-smoke sm:text-base">
          {t.custom.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mt-10">
        <CustomStudio initialDesignId={designId ?? null} />
      </div>
    </div>
  );
}
