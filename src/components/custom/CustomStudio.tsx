"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { StickerArt } from "@/components/tee/StickerArt";
import { TeePreview } from "@/components/tee/TeePreview";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SizeGuideDialog } from "@/components/ui/SizeGuideDialog";
import { buttonClass } from "@/components/ui/button";
import {
  FITS,
  MAX_STICKERS,
  SIZES,
  STICKERS,
  TEE_COLORS,
  calcCustomUnitPrice,
  getFit,
  getSticker,
  getTeeColor,
} from "@/lib/catalog";
import type { FitId, Size, StickerId, TeeColorId } from "@/lib/catalog";
import { fill, formatINR } from "@/lib/currency";
import { cn } from "@/lib/cn";

type Step = 1 | 2 | 3 | 4;

export function CustomStudio() {
  const { lang, t } = useLanguage();
  const { addCustom } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [fitId, setFitId] = useState<FitId>("regular");
  const [size, setSize] = useState<Size | null>(null);
  const [colorId, setColorId] = useState<TeeColorId>("cream");
  const [stickerIds, setStickerIds] = useState<StickerId[]>([]);
  const [qty, setQty] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const wizardRef = useRef<HTMLDivElement>(null);

  const fit = getFit(fitId);
  const color = getTeeColor(colorId);
  const fitName = lang === "ta" ? fit.nameTa : fit.nameEn;
  const colorName = lang === "ta" ? color.nameTa : color.nameEn;
  const unitPrice = calcCustomUnitPrice(fitId, stickerIds);
  const stickerTotal = stickerIds.reduce(
    (sum, id) => sum + getSticker(id).price,
    0,
  );
  const total = unitPrice * qty;

  const stepLabels: { value: Step; label: string }[] = [
    { value: 1, label: t.custom.step1 },
    { value: 2, label: t.custom.step2 },
    { value: 3, label: t.custom.step3 },
    { value: 4, label: t.custom.step4 },
  ];

  function scrollToWizard() {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    window.requestAnimationFrame(() => {
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goToStep(next: Step) {
    setStep(next);
    setStepError(null);
    scrollToWizard();
  }

  function handleContinue() {
    if (step === 1 && !size) {
      setStepError(t.product.selectSizeError);
      return;
    }
    if (step === 3 && stickerIds.length === 0) {
      setStepError(t.custom.stickersRequired);
      return;
    }
    if (step === 4) return;
    const next = (step + 1) as Step;
    setStep(next);
    setMaxStep((current) => (next > current ? next : current));
    setStepError(null);
    scrollToWizard();
  }

  function handleBack() {
    if (step === 1) return;
    goToStep((step - 1) as Step);
  }

  function toggleSticker(id: StickerId) {
    if (stickerIds.includes(id)) {
      setStickerIds((current) => current.filter((item) => item !== id));
      setStepError(null);
      return;
    }
    if (stickerIds.length >= MAX_STICKERS) {
      setStepError(t.custom.stickersLimit);
      return;
    }
    setStickerIds((current) => [...current, id]);
    setStepError(null);
  }

  function handleAddToCart() {
    if (!size) {
      setStep(1);
      setStepError(t.product.selectSizeError);
      scrollToWizard();
      return;
    }
    addCustom({ fit: fitId, size, colorId, stickerIds }, qty);
    showToast({
      title: t.custom.addedToast,
      description: fill(t.custom.addedDesc, {
        fit: fitName,
        color: colorName,
        size,
      }),
      href: "/cart",
      hrefLabel: t.toasts.viewCart,
    });
  }

  function handleBuyNow() {
    if (!size) {
      setStep(1);
      setStepError(t.product.selectSizeError);
      scrollToWizard();
      return;
    }
    addCustom({ fit: fitId, size, colorId, stickerIds }, qty);
    router.push("/checkout");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-12">
      <div className="lg:sticky lg:top-24">
        <div className="rounded-3xl border border-line bg-paper p-4 sm:p-5 lg:rounded-[2rem] lg:p-6">
          <div className="flex gap-4 lg:block">
            <div className="w-[38%] max-w-[148px] shrink-0 lg:mx-auto lg:max-w-[310px]">
              <TeePreview colorId={colorId} stickerIds={stickerIds} />
            </div>
            <div className="min-w-0 flex-1 lg:mt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">{t.custom.previewFront}</p>
                <span className="hidden rounded-full bg-shell px-2.5 py-1 text-[10px] font-semibold text-smoke lg:inline-flex">
                  {fill(t.custom.previewColour, { color: colorName })}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip px-2.5 py-1 text-[10px]">{fitName}</span>
                {size ? (
                  <span className="chip px-2.5 py-1 text-[10px]">{size}</span>
                ) : null}
                <span className="chip gap-1 px-2.5 py-1 text-[10px]">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-ink/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  {colorName}
                </span>
                {stickerIds.length > 0 ? (
                  <span className="chip px-2.5 py-1 text-[10px]">
                    {fill(t.custom.stickersSelected, {
                      count: stickerIds.length,
                      max: MAX_STICKERS,
                    })}
                  </span>
                ) : null}
              </div>

              <p className="mt-2.5 text-[11px] leading-relaxed text-smoke">
                {t.custom.previewNote}
              </p>

              <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                <span className="text-[11px] text-smoke">{t.custom.total}</span>
                <span className="font-display text-lg font-bold tracking-[-0.02em]">
                  {formatINR(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 hidden text-center text-[11px] text-smoke lg:block">
          {t.custom.oneOfThree}
        </p>
      </div>

      <div ref={wizardRef} className="scroll-mt-24">
        <div
          className="flex items-start justify-between gap-1 sm:gap-2"
          aria-label={fill(t.custom.stepOf, { current: step })}
        >
          {stepLabels.map((item) => {
            const isActive = item.value === step;
            const isDone = item.value < step || item.value < maxStep;
            const reachable = item.value <= maxStep;
            return (
              <button
                key={item.value}
                type="button"
                disabled={!reachable}
                onClick={() => goToStep(item.value)}
                aria-current={isActive ? "step" : undefined}
                className="group flex flex-1 flex-col items-center gap-1.5 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border text-[11px] font-bold transition sm:h-9 sm:w-9",
                    isActive
                      ? "border-ink bg-ink text-paper"
                      : isDone
                        ? "border-ink/25 bg-paper text-ink"
                        : "border-line bg-shell text-smoke",
                  )}
                >
                  {isDone && !isActive ? <Check size={13} /> : item.value}
                </span>
                <span
                  className={cn(
                    "text-center text-[9.5px] font-medium leading-tight transition sm:text-[11px]",
                    isActive
                      ? "text-ink"
                      : reachable
                        ? "text-smoke group-hover:text-ink"
                        : "text-smoke/50",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
            {fill(t.custom.stepOf, { current: step })}
          </p>

          <div key={step} className="animate-fade-in">
            {step === 1 ? (
              <div>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {t.custom.fitLabel}
                </h2>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  {FITS.map((option) => {
                    const selected = option.id === fitId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFitId(option.id)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-ink bg-ink/[0.03] ring-1 ring-ink"
                            : "border-line bg-paper hover:border-ink/30",
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {lang === "ta" ? option.nameTa : option.nameEn}
                          </span>
                          <span className="shrink-0 text-[13px] font-semibold">
                            {formatINR(option.price)}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-smoke">
                          {lang === "ta" ? option.descTa : option.descEn}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{t.custom.sizeLabel}</h3>
                    <SizeGuideDialog label={t.custom.sizeGuide} />
                  </div>
                  <div
                    role="group"
                    aria-label={t.custom.sizeLabel}
                    className="mt-2.5 grid grid-cols-5 gap-2"
                  >
                    {SIZES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSize(option);
                          setStepError(null);
                        }}
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
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {t.custom.colourLabel}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-smoke">
                  {t.custom.colourHint}
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3">
                  {TEE_COLORS.map((option) => {
                    const selected = option.id === colorId;
                    const name = lang === "ta" ? option.nameTa : option.nameEn;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setColorId(option.id)}
                        aria-pressed={selected}
                        aria-label={name}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl border p-2.5 transition",
                          selected
                            ? "border-ink bg-ink/[0.03] ring-1 ring-ink"
                            : "border-line bg-paper hover:border-ink/30",
                        )}
                      >
                        <span
                          className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/10 sm:h-11 sm:w-11"
                          style={{ backgroundColor: option.hex }}
                        >
                          {selected ? (
                            <Check
                              size={16}
                              strokeWidth={2.6}
                              className={
                                option.tone === "dark" ? "text-paper" : "text-ink"
                              }
                            />
                          ) : null}
                        </span>
                        <span className="text-[10.5px] font-medium leading-tight sm:text-[11px]">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                      {t.custom.stickersLabel}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-smoke">
                      {t.custom.stickersHint}
                    </p>
                  </div>
                  {stickerIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStickerIds([]);
                        setStepError(null);
                      }}
                      className="shrink-0 text-[11px] font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink"
                    >
                      {t.custom.clearStickers}
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-shell px-2.5 py-1 text-[10px] font-semibold text-smoke">
                    {fill(t.custom.stickersSelected, {
                      count: stickerIds.length,
                      max: MAX_STICKERS,
                    })}
                  </span>
                  <span className="text-[10px] text-smoke">
                    {t.custom.oneOfThree}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                  {STICKERS.map((sticker) => {
                    const selected = stickerIds.includes(sticker.id);
                    const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
                    return (
                      <button
                        key={sticker.id}
                        type="button"
                        onClick={() => toggleSticker(sticker.id)}
                        aria-pressed={selected}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition sm:p-2.5",
                          selected
                            ? "border-ink bg-ink/[0.03] ring-1 ring-ink"
                            : "border-line bg-paper hover:border-ink/30",
                        )}
                      >
                        <span
                          className="grid aspect-square w-full max-w-[62px] place-items-center rounded-xl p-2"
                          style={{ backgroundColor: sticker.bg }}
                        >
                          <StickerArt sticker={sticker} />
                        </span>
                        <span className="text-[10.5px] font-semibold leading-tight">
                          {name}
                        </span>
                        <span className="text-[9.5px] leading-none text-smoke">
                          {fill(t.custom.eachSticker, {
                            price: formatINR(sticker.price),
                          })}
                        </span>
                        {selected ? (
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
                            <Check size={11} strokeWidth={2.6} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {t.custom.reviewTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-smoke">
                  {t.custom.reviewText}
                </p>

                <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">{t.custom.reviewFit}</span>
                    <span className="text-right text-[13px] font-medium">
                      {fitName}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">{t.custom.reviewSize}</span>
                    <span className="text-right text-[13px] font-medium">
                      {size ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">
                      {t.custom.reviewColour}
                    </span>
                    <span className="flex items-center gap-1.5 text-right text-[13px] font-medium">
                      <span
                        className="h-3 w-3 rounded-full border border-ink/10"
                        style={{ backgroundColor: color.hex }}
                      />
                      {colorName}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="shrink-0 text-xs text-smoke">
                      {t.custom.reviewStickers}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {stickerIds.length === 0 ? (
                        <span className="text-[13px] font-medium">—</span>
                      ) : (
                        stickerIds.map((id) => {
                          const sticker = getSticker(id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pl-0.5 pr-2 text-[10.5px] font-medium"
                            >
                              <span
                                className="grid h-5 w-5 place-items-center rounded-full p-0.5"
                                style={{ backgroundColor: sticker.bg }}
                              >
                                <StickerArt sticker={sticker} />
                              </span>
                              {lang === "ta" ? sticker.nameTa : sticker.nameEn}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-shell/70 p-4 sm:p-5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-smoke">{t.custom.basePrice}</span>
                    <span className="font-medium">{formatINR(fit.price)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[13px]">
                    <span className="text-smoke">
                      {fill(t.custom.stickersPrice, { count: stickerIds.length })}
                    </span>
                    <span className="font-medium">
                      +{formatINR(stickerTotal)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-[13px] font-semibold">
                      {t.custom.quantity}
                    </span>
                    <QuantityStepper value={qty} onChange={setQty} small />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm font-semibold">
                      {t.custom.total}
                      {qty > 1 ? (
                        <span className="ml-1 text-[11px] font-normal text-smoke">
                          × {qty}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                      {formatINR(total)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={buttonClass({ size: "lg" })}
                  >
                    <ShoppingBag size={17} />
                    {t.custom.addToCart}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className={buttonClass({ variant: "rust", size: "lg" })}
                  >
                    <Zap size={16} />
                    {t.custom.buyNow}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {stepError ? (
            <p role="alert" className="error-text">
              {stepError}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                <ArrowLeft size={15} />
                {t.custom.back}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-smoke">
                <Sparkles size={13} className="text-rust" />
                {t.custom.previewNote}
              </span>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleContinue}
                className={buttonClass({ size: "md" })}
              >
                {t.custom.continue}
                <ArrowRight size={15} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
