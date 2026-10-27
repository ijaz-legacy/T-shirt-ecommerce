import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ClipboardCheck,
  Leaf,
  MapPin,
  Palette,
  Scissors,
  Shirt,
  Sparkles,
  Sticker,
} from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { TeePreview } from "@/components/tee/TeePreview";
import { buttonClass } from "@/components/ui/button";
import { FIT_MAP } from "@/lib/catalog";
import { fill, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getFeaturedProducts } from "@/lib/products";

export default async function HomePage() {
  const { t } = await getDictionary();
  const featured = await getFeaturedProducts(4);
  const fromPrice = formatINR(FIT_MAP.regular.price);

  const steps = [
    { icon: Shirt, title: t.home.step1Title, text: t.home.step1Text },
    { icon: Palette, title: t.home.step2Title, text: t.home.step2Text },
    { icon: Sticker, title: t.home.step3Title, text: t.home.step3Text },
    { icon: ClipboardCheck, title: t.home.step4Title, text: t.home.step4Text },
  ];

  const values = [
    { icon: Leaf, title: t.home.valueCottonTitle, text: t.home.valueCottonText },
    { icon: Sparkles, title: t.home.valuePrintTitle, text: t.home.valuePrintText },
    { icon: Banknote, title: t.home.valueCodTitle, text: t.home.valueCodText },
    { icon: MapPin, title: t.home.valueLocalTitle, text: t.home.valueLocalText },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 top-10 hidden h-80 w-80 rounded-full bg-gold/15 blur-3xl lg:block" />
        <div className="container-page pb-14 pt-8 sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="animate-fade-up">
              <p className="eyebrow flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                {t.home.eyebrow}
              </p>
              <h1 className="display-title mt-4 text-[42px] leading-[0.98] sm:text-6xl lg:text-[76px]">
                {t.home.titleA}
                <br />
                <span className="accent-serif">{t.home.titleB}</span>
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-smoke sm:text-base">
                {t.home.subtitle}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className={buttonClass({ size: "lg" })}>
                  {t.home.ctaShop}
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/customize"
                  className={buttonClass({ variant: "outline", size: "lg" })}
                >
                  <Sparkles size={16} />
                  {t.home.ctaCustom}
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-[11px] font-medium text-smoke sm:text-xs">
                <li className="flex items-center gap-1.5">
                  <Banknote size={14} className="text-rust" />
                  {t.home.trustCod}
                </li>
                <li className="flex items-center gap-1.5">
                  <Leaf size={14} className="text-moss" />
                  {t.home.trustCotton}
                </li>
                <li className="flex items-center gap-1.5">
                  <Scissors size={14} className="text-gold" />
                  {t.home.trustMade}
                </li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-[520px] animate-fade-up pb-8 lg:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#E7DCC9] sm:rounded-[2.5rem]">
                <Image
                  src="/images/hero.webp"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink/30 via-transparent to-transparent" />
              </div>

              <div className="absolute -bottom-1 left-3 right-3 rounded-3xl border border-line bg-paper/95 p-4 shadow-soft backdrop-blur sm:-bottom-2 sm:-left-6 sm:right-auto sm:w-[310px] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow text-rust">{t.home.heroCardLabel}</p>
                    <p className="mt-1.5 font-display text-sm font-semibold leading-snug">
                      {t.home.heroCardText}
                    </p>
                    <Link
                      href="/customize"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 transition hover:decoration-ink"
                    >
                      {t.home.heroCardCta}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="w-[76px] shrink-0 sm:w-[88px]">
                    <TeePreview colorId="cream" stickerIds={["sun", "wave"]} />
                  </div>
                </div>
              </div>

              <div className="absolute -top-3 right-4 hidden h-[86px] w-[86px] -rotate-6 flex-col items-center justify-center gap-1 rounded-full bg-gold text-ink shadow-card sm:flex">
                <Banknote size={20} />
                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em]">
                  {t.checkout.codOnly}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="overflow-hidden bg-ink py-3 text-paper">
        <div className="flex w-max animate-marquee items-center">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 items-center">
              {[0, 1].map((item) => (
                <span
                  key={item}
                  className="whitespace-nowrap px-5 text-[10px] font-medium uppercase tracking-[0.2em] text-paper/80 sm:text-[11px]"
                >
                  {t.home.marquee}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="py-14 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t.home.featuredEyebrow}</p>
              <h2 className="display-title mt-2 text-3xl leading-[1.05] sm:text-4xl lg:text-[44px]">
                {t.home.featuredTitle}
              </h2>
            </div>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 text-sm font-semibold"
            >
              {t.home.featuredCta}
              <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 transition group-hover:bg-ink group-hover:text-paper">
                <ArrowRight size={15} />
              </span>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-14 sm:pb-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">{t.home.categoryEyebrow}</p>
            <h2 className="display-title mt-2 text-3xl leading-[1.08] sm:text-4xl lg:text-[44px]">
              {t.home.categoryTitle}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
            <Link
              href="/shop"
              className="group relative flex min-h-[400px] flex-col justify-end overflow-hidden rounded-[2rem] bg-ink p-6 text-paper sm:min-h-[460px] sm:p-9"
            >
              <Image
                src="/images/products/alai.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/35 to-ink/5" />
              <div className="relative">
                <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {t.home.printedTitle}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
                  {t.home.printedText}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                  {t.home.printedCta}
                  <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>

            <Link
              href="/customize"
              className="group relative flex min-h-[400px] flex-col overflow-hidden rounded-[2rem] bg-[#EDE1CC] p-6 sm:min-h-[460px] sm:p-9"
            >
              <span className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold/25" />
              <span className="dot-grid absolute inset-0 opacity-40" />
              <div className="relative z-10 flex max-w-[68%] flex-col">
                <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {t.home.customTitle}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/60">
                  {t.home.customText}
                </p>
                <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition group-hover:bg-rust">
                  {t.home.customCta}
                  <ArrowRight size={14} />
                </span>
              </div>
              <div className="absolute -bottom-8 -right-8 w-[58%] max-w-[290px] rotate-[4deg] transition duration-500 group-hover:rotate-0 sm:-bottom-10 sm:-right-2">
                <TeePreview colorId="sand" stickerIds={["sun", "heart", "star"]} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-24">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="eyebrow">{t.home.howEyebrow}</p>
              <h2 className="display-title mt-2 text-3xl leading-[1.05] sm:text-4xl lg:text-[44px]">
                {t.home.howTitle}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-smoke">
                {t.home.howSubtitle}
              </p>
              <Link
                href="/customize"
                className={buttonClass({ className: "mt-6" })}
              >
                {t.home.ctaButton}
                <ArrowRight size={16} />
              </Link>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="rounded-3xl border border-line bg-shell/70 p-5 transition hover:border-ink/20 sm:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-rust shadow-xs">
                        <Icon size={18} />
                      </span>
                      <span className="font-serif text-2xl italic text-line">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-smoke">
                      {step.text}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container-page">
          <div className="rounded-[2rem] bg-ink p-6 text-paper sm:rounded-[2.5rem] sm:p-10 lg:p-12">
            <div className="max-w-xl">
              <p className="eyebrow text-gold">{t.home.valuesEyebrow}</p>
              <h2 className="display-title mt-2 text-3xl leading-[1.05] text-paper sm:text-4xl">
                {t.home.valuesTitle}
              </h2>
            </div>
            <div className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div key={value.title}>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-paper/10 text-gold">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-3.5 font-display text-base font-semibold">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-paper/55">
                      {value.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="container-page">
          <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-[#EAD8B7] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="display-title text-2xl leading-tight sm:text-3xl">
                {t.home.ctaTitle}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/65">
                {t.home.ctaText}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-ink/45">
                {fill(t.home.ctaNote, { price: fromPrice })}
              </p>
            </div>
            <Link
              href="/customize"
              className={buttonClass({ size: "lg", className: "shrink-0" })}
            >
              {t.home.ctaButton}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
