import Link from "next/link";
import { ArrowLeft, Shirt } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getDictionary } from "@/lib/lang";

export default async function NotFound() {
  const { t } = await getDictionary();

  return (
    <div className="container-page flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">{t.notFound.eyebrow}</p>
      <h1 className="display-title mt-3 max-w-xl text-4xl leading-[1.05] sm:text-6xl">
        {t.notFound.title}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-smoke sm:text-base">
        {t.notFound.text}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass()}>
          <ArrowLeft size={16} />
          {t.notFound.cta}
        </Link>
        <Link href="/shop" className={buttonClass({ variant: "outline" })}>
          <Shirt size={16} />
          {t.notFound.shop}
        </Link>
      </div>
    </div>
  );
}
