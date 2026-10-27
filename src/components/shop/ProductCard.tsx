"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatINR } from "@/lib/currency";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { lang, t } = useLanguage();
  const name = lang === "ta" ? product.nameTa : product.nameEn;
  const color = lang === "ta" ? product.colorTa : product.colorEn;
  const soldOut = product.stock === 0;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#EDE4D5]">
        <Image
          src={product.image}
          alt={name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={
            soldOut
              ? "object-cover opacity-55 transition duration-700 ease-out"
              : "object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
          }
        />
        {product.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-paper/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink shadow-xs backdrop-blur">
            {t.badges[product.badge]}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-paper backdrop-blur">
            {t.product.soldOut}
          </span>
        ) : null}
        <span className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-paper text-ink opacity-0 shadow-xs transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[15px] font-semibold leading-snug tracking-[-0.01em] sm:text-base">
            {name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-smoke sm:text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/10"
              style={{ backgroundColor: product.colorHex }}
            />
            <span className="truncate">
              {color} · {soldOut ? t.product.soldOut : t.shop.sizes}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold sm:text-sm">
          {formatINR(product.price)}
        </p>
      </div>
    </Link>
  );
}
