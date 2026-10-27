"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SizeGuideDialog } from "@/components/ui/SizeGuideDialog";
import { buttonClass } from "@/components/ui/button";
import { MAX_QTY, SIZES } from "@/lib/catalog";
import { fill } from "@/lib/currency";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";
import type { Size } from "@/lib/catalog";

export function ProductPurchase({
  product,
  stock,
}: {
  product: Product;
  stock: number;
}) {
  const { lang, t } = useLanguage();
  const { addPrinted } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, stock));

  const name = lang === "ta" ? product.nameTa : product.nameEn;

  function chooseSize(next: Size) {
    setSize(next);
    setSizeError(null);
  }

  function handleAdd() {
    if (soldOut) return;
    if (!size) {
      setSizeError(t.product.selectSizeError);
      return;
    }
    addPrinted(product.slug, size, qty);
    showToast({
      title: t.product.addedToCart,
      description: fill(t.product.addedDesc, { name, size }),
      href: "/cart",
      hrefLabel: t.toasts.viewCart,
    });
  }

  function handleBuyNow() {
    if (soldOut) return;
    if (!size) {
      setSizeError(t.product.selectSizeError);
      return;
    }
    addPrinted(product.slug, size, qty);
    router.push("/checkout");
  }

  return (
    <div>
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold">{t.product.chooseSize}</p>
          <SizeGuideDialog label={t.product.sizeGuide} />
        </div>
        <p className="mt-0.5 text-xs text-smoke">{t.product.chooseSizeHint}</p>
        <div
          role="group"
          aria-label={t.product.chooseSize}
          aria-describedby={sizeError ? "size-error" : undefined}
          className="mt-3 grid grid-cols-5 gap-2"
        >
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => chooseSize(option)}
              aria-pressed={size === option}
              className={cn(
                "rounded-xl border py-3 text-[13px] font-semibold transition",
                size === option
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-paper text-ink hover:border-ink/40",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        {sizeError ? (
          <p id="size-error" role="alert" className="error-text">
            {sizeError}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold">{t.product.quantity}</p>
        <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
      </div>
      {!soldOut && stock <= 5 ? (
        <p className="mt-2 text-right text-[11px] font-semibold text-[#7A5A18]">
          {fill(t.product.lowStock, { count: stock })}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
        {soldOut ? (
          <button
            type="button"
            disabled
            className={buttonClass({ size: "lg", className: "sm:col-span-2" })}
          >
            <ShoppingBag size={17} />
            {t.product.soldOut}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAdd}
              className={buttonClass({ size: "lg" })}
            >
              <ShoppingBag size={17} />
              {t.product.addToCart}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              <Zap size={16} />
              {t.product.buyNow}
            </button>
          </>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/20 text-[#7A5A18]">
          <Banknote size={15} />
        </span>
        <div>
          <p className="text-[13px] font-semibold">{t.product.codTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-smoke">
            {t.product.codText}
          </p>
        </div>
      </div>
    </div>
  );
}
