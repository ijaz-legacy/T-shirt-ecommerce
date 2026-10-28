"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { TeePreview } from "@/components/tee/TeePreview";
import { buttonClass } from "@/components/ui/button";
import {
  FREE_SHIPPING_THRESHOLD,
  MAX_QTY,
  calcCustomUnitPrice,
  calcShipping,
  getFit,
  getSticker,
  getTeeColor,
  parsePlacementRef,
} from "@/lib/catalog";
import { fill, formatINR } from "@/lib/currency";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

export function CartView({ products }: { products: Product[] }) {
  const { lang, t } = useLanguage();
  const { lines, hydrated, updateQty, remove, count } = useCart();

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  );

  const rows = useMemo(() => {
    return lines.map((line) => {
      if (line.kind === "printed") {
        const product = productMap.get(line.productSlug) ?? null;
        return {
          line,
          available: Boolean(product && product.stock > 0),
          unitPrice: product?.price ?? 0,
          name: product
            ? lang === "ta"
              ? product.nameTa
              : product.nameEn
            : t.cart.unavailable,
          product,
        };
      }
      return {
        line,
        available: true,
        unitPrice: calcCustomUnitPrice(
          line.config.fit,
          line.config.placements.map((p) => p.scale),
        ),
        name: null,
        product: null,
      };
    });
  }, [lines, productMap, lang, t.cart.unavailable]);

  const subtotal = rows.reduce(
    (sum, row) => (row.available ? sum + row.unitPrice * row.line.qty : sum),
    0,
  );
  const itemCount = rows.reduce((sum, row) => sum + row.line.qty, 0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  if (!hydrated) {
    return (
      <div className="container-page py-8 sm:py-12 lg:py-16">
        <p className="sr-only">{t.cart.loading}</p>
        <div className="animate-pulse">
          <div className="h-3 w-24 rounded-full bg-line" />
          <div className="mt-4 h-10 w-56 rounded-2xl bg-line/80" />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-3xl border border-line bg-paper p-4"
                >
                  <div className="h-[110px] w-[88px] shrink-0 rounded-2xl bg-line/60" />
                  <div className="flex-1 py-2">
                    <div className="h-4 w-32 rounded-full bg-line/80" />
                    <div className="mt-2.5 h-3 w-24 rounded-full bg-line/60" />
                    <div className="mt-8 h-8 w-28 rounded-full bg-line/50" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-72 rounded-3xl border border-line bg-paper" />
          </div>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-12 sm:py-20">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-paper text-smoke shadow-card">
            <ShoppingBag size={26} strokeWidth={1.6} />
          </span>
          <h1 className="display-title mt-5 text-3xl sm:text-4xl">
            {t.cart.emptyTitle}
          </h1>
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-smoke">
            {t.cart.emptyText}
          </p>
          <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <Link href="/shop" className={buttonClass({ size: "lg" })}>
              {t.cart.emptyCta}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/customize"
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              {t.cart.emptyCustomCta}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t.cart.eyebrow}</p>
          <h1 className="display-title mt-2 text-4xl leading-none sm:text-5xl">
            {t.cart.title}
          </h1>
          <p className="mt-2 text-sm text-smoke">
            {count === 1
              ? t.cart.subtitleOne
              : fill(t.cart.subtitleMany, { count })}
          </p>
        </div>
        <Link
          href="/shop"
          className="hidden text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink sm:inline"
        >
          {t.cart.continueShopping}
        </Link>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div className="space-y-3">
          {rows.map((row) => {
            if (!row.available) {
              return (
                <div
                  key={row.line.id}
                  className="flex items-center gap-3 rounded-3xl border border-dashed border-rust/30 bg-paper p-4"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rust/10 text-rust">
                    <AlertCircle size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.cart.unavailable}</p>
                    <p className="mt-0.5 truncate text-xs text-smoke">
                      {row.line.kind === "printed" ? row.line.productSlug : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(row.line.id)}
                    className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-rust transition hover:border-rust/40 hover:bg-rust/5"
                  >
                    {t.cart.removeUnavailable}
                  </button>
                </div>
              );
            }

            const line = row.line;
            let title = row.name ?? "";
            let subtitle = "";
            let image: string | null = null;
            let stickerNames: string[] = [];

            if (line.kind === "printed" && row.product) {
              subtitle = `${lang === "ta" ? row.product.colorTa : row.product.colorEn} · ${line.size}`;
              image = row.product.image;
            } else if (line.kind === "custom") {
              title = t.cart.customTee;
              const fit = getFit(line.config.fit);
              const color = getTeeColor(line.config.colorId);
              subtitle = `${lang === "ta" ? fit.nameTa : fit.nameEn} · ${line.config.size} · ${
                lang === "ta" ? color.nameTa : color.nameEn
              }`;
              stickerNames = line.config.placements.map((p) => {
                const parsed = parsePlacementRef(p.ref);
                if (!parsed) return "";
                if (parsed.type === "image") return t.custom.yourImage;
                if (parsed.type === "text") return p.text?.content ? `"${p.text.content}"` : "Text";
                const sticker = getSticker(parsed.id);
                return lang === "ta" ? sticker.nameTa : sticker.nameEn;
              });
            }

            return (
              <div
                key={line.id}
                className="flex gap-3 rounded-3xl border border-line bg-paper p-3 sm:gap-4 sm:p-4"
              >
                <div className="relative h-[104px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-[#EDE4D5] sm:h-[124px] sm:w-[100px]">
                  {line.kind === "custom" ? (
                    <div className="flex h-full items-center justify-center p-1.5">
                      <TeePreview
                        colorId={line.config.colorId}
                        placements={line.config.placements}
                        face={line.config.placements.some((p) => !p.face || p.face === "front") ? "front" : "back"}
                      />
                    </div>
                  ) : image ? (
                    <Image
                      src={image}
                      alt={title}
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-smoke">
                      <ShoppingBag size={22} />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {line.kind === "printed" && row.product ? (
                        <Link
                          href={`/product/${row.product.slug}`}
                          className="block truncate font-display text-sm font-semibold leading-snug tracking-[-0.01em] transition hover:text-rust sm:text-[15px]"
                        >
                          {title}
                        </Link>
                      ) : (
                        <p className="truncate font-display text-sm font-semibold leading-snug tracking-[-0.01em] sm:text-[15px]">
                          {title}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-smoke">{subtitle}</p>
                      {stickerNames.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {stickerNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full bg-shell px-2 py-0.5 text-[9.5px] font-medium text-smoke"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1.5 text-[10px] text-smoke/80">
                        {fill(t.cart.itemPrice, {
                          price: formatINR(row.unitPrice),
                        })}
                      </p>
                      {line.kind === "printed" &&
                      row.product &&
                      line.qty > row.product.stock ? (
                        <p className="mt-1 text-[10.5px] font-semibold text-rust">
                          {fill(t.product.lowStock, {
                            count: row.product.stock,
                          })}
                        </p>
                      ) : null}
                    </div>
                    <p className="hidden shrink-0 text-sm font-semibold sm:block">
                      {formatINR(row.unitPrice * row.line.qty)}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <QuantityStepper
                      value={row.line.qty}
                      onChange={(value) => updateQty(row.line.id, value)}
                      max={
                        line.kind === "printed" && row.product
                          ? Math.max(
                              1,
                              Math.min(MAX_QTY, row.product.stock),
                            )
                          : MAX_QTY
                      }
                      small
                    />
                    <p className="text-[13px] font-semibold sm:hidden">
                      {formatINR(row.unitPrice * row.line.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(row.line.id)}
                      aria-label={`${t.cart.remove} — ${title}`}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium text-smoke transition hover:bg-rust/5 hover:text-rust"
                    >
                      <Trash2 size={12} />
                      {t.cart.remove}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            href="/shop"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink sm:hidden"
          >
            {t.cart.continueShopping}
            <ArrowRight size={13} />
          </Link>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
            {subtotal > 0 ? (
              <div className="mb-5 rounded-2xl bg-shell px-4 py-3.5">
                <p className="text-[11px] font-medium leading-relaxed text-ink">
                  {freeShipping
                    ? t.cart.freeShipDone
                    : fill(t.cart.freeShipPrefix, {
                        amount: formatINR(remaining),
                      })}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      freeShipping ? "bg-moss" : "bg-rust",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-smoke">
                  {fill(t.cart.freeShipHint, {
                    threshold: formatINR(FREE_SHIPPING_THRESHOLD),
                  })}
                </p>
              </div>
            ) : null}

            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              {t.cart.title}
            </h2>
            <div className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.cart.subtotal}</span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.cart.shipping}</span>
                <span className="font-medium">
                  {shipping === 0 ? t.common.free : formatINR(shipping)}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-semibold">{t.cart.total}</span>
              <span className="font-display text-xl font-bold tracking-[-0.02em]">
                {formatINR(total)}
              </span>
            </div>

            <Link
              href="/checkout"
              aria-disabled={subtotal <= 0}
              tabIndex={subtotal <= 0 ? -1 : undefined}
              className={buttonClass({
                full: true,
                size: "lg",
                className: cn(
                  "mt-5",
                  subtotal <= 0 && "pointer-events-none opacity-50",
                ),
              })}
            >
              {t.cart.checkout}
              <ArrowRight size={16} />
            </Link>

            <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-smoke">
              <p className="flex items-start gap-2">
                <Banknote size={13} className="mt-0.5 shrink-0 text-[#7A5A18]" />
                {t.cart.codNote}
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-moss" />
                {t.cart.secureNote}
              </p>
            </div>
          </div>

          <p className="mt-3 px-2 text-center text-[10px] text-smoke">
            {t.cart.maxQty} · {itemCount}{" "}
            {itemCount === 1 ? t.cart.unitItem : t.cart.unitItems}
          </p>
        </aside>
      </div>
    </div>
  );
}
