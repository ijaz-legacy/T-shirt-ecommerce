import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductCard } from "@/components/shop/ProductCard";
import { fill, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getAllProducts, getProductBySlug } from "@/lib/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const { lang, t } = await getDictionary();

  if (!product) {
    return { title: t.product.notFoundTitle };
  }

  const name = lang === "ta" ? product.nameTa : product.nameEn;
  const description = lang === "ta" ? product.descTa : product.descEn;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      images: [{ url: product.image, alt: name }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { lang, t } = await getDictionary();
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const name = lang === "ta" ? product.nameTa : product.nameEn;
  const color = lang === "ta" ? product.colorTa : product.colorEn;
  const description = lang === "ta" ? product.descTa : product.descEn;
  const soldOut = product.stock === 0;
  const related = (await getAllProducts())
    .filter((item) => item.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="container-page py-6 sm:py-10 lg:py-12">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-smoke"
      >
        <Link href="/shop" className="transition hover:text-ink">
          {t.product.breadcrumbShop}
        </Link>
        <ChevronRight size={12} />
        <span className="truncate text-ink">{name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-12">
        <div className="self-start lg:sticky lg:top-24">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-[#EDE4D5] sm:rounded-[2.5rem]">
            <Image
              src={product.image}
              alt={name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover"
            />
            {product.badge ? (
              <span className="absolute left-4 top-4 rounded-full bg-paper/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-xs backdrop-blur">
                {t.badges[product.badge]}
              </span>
            ) : null}
            <span className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1.5 text-[10px] font-medium text-paper backdrop-blur">
              {soldOut ? t.product.soldOut : t.product.madeToOrderBadge}
            </span>
          </div>
          <p className="mt-3 text-center text-[11px] text-smoke">
            {soldOut ? t.product.zoomHintSoldOut : t.product.zoomHint}
          </p>
        </div>

        <div className="lg:py-1">
          <p className="eyebrow">{t.categories[product.category]}</p>
          <h1 className="display-title mt-2 text-4xl leading-[1.02] sm:text-5xl">
            {name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <p className="text-lg font-semibold sm:text-xl">
              {formatINR(product.price)}
            </p>
            {soldOut ? (
              <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-paper">
                {t.product.soldOut}
              </span>
            ) : (
              <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7A5A18]">
                {t.product.madeToOrderBadge}
              </span>
            )}
            {!soldOut && product.stock <= 5 ? (
              <span className="text-[11px] font-semibold text-[#7A5A18]">
                {fill(t.product.lowStock, { count: product.stock })}
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-smoke sm:text-[15px]">
            {description}
          </p>
          {soldOut ? (
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-rust">
              {t.product.soldOutText}
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-2 text-xs text-smoke">
            <span className="text-[13px] font-semibold text-ink">
              {t.product.colour}
            </span>
            <span
              className="h-3.5 w-3.5 rounded-full border border-ink/15"
              style={{ backgroundColor: product.colorHex }}
            />
            <span>{color}</span>
          </div>

          <ProductPurchase product={product} stock={product.stock} />

          <div className="mt-6 border-t border-line">
            <details className="accordion group border-b border-line py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
                {t.product.detailsFabric}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-smoke transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2.5 text-[13px] leading-relaxed text-smoke">
                {t.product.detailsFabricText}
              </p>
            </details>
            <details className="accordion group border-b border-line py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
                {t.product.detailsCare}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-smoke transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2.5 text-[13px] leading-relaxed text-smoke">
                {t.product.detailsCareText}
              </p>
            </details>
            <details className="accordion group border-b border-line py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
                {t.product.detailsDelivery}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-smoke transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2.5 text-[13px] leading-relaxed text-smoke">
                {t.product.detailsDeliveryText}
              </p>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14 sm:mt-20">
          <h2 className="display-title text-2xl sm:text-3xl">
            {t.product.related}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
