"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlipHorizontal2,
  Grid3x3,
  Loader2,
  Pencil,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { TeeCanvas } from "@/components/custom/TeeCanvas";
import { ImageEditor } from "@/components/custom/ImageEditor";
import { StickerStyleEditor } from "@/components/custom/StickerStyleEditor";
import type { StickerStyle } from "@/components/custom/StickerStyleEditor";
import { StickerArt } from "@/components/tee/StickerArt";
import { TeePreview } from "@/components/tee/TeePreview";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SizeGuideDialog } from "@/components/ui/SizeGuideDialog";
import { buttonClass } from "@/components/ui/button";
import {
  CATEGORY_DEFAULT_SCALE,
  FITS,
  FULL_SCALE_THRESHOLD,
  MAX_PLACEMENTS,
  MAX_ROTATION,
  MAX_SCALE,
  MIN_ROTATION,
  MIN_SCALE,
  SIZES,
  STICKERS,
  TEE_COLORS,
  calcCustomUnitPrice,
  getFit,
  getSticker,
  getTeeColor,
  isStickerId,
  parsePlacementRef,
  priceForScale,
} from "@/lib/catalog";
import type { FitId, Size, StickerCategory, TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import { fill, formatINR } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";

type Step = 1 | 2 | 3 | 4;

interface ApiSticker {
  id: string;
  nameEn: string;
  nameTa: string;
  image: string;
  category: StickerCategory;
}

interface SizeCategoryModal {
  file: File;
  pending: boolean;
}

// State for the sticker-style editor dialog
interface StickerEditorState {
  ref: string;
  category: StickerCategory;
  // if editing an existing placement, its index
  existingIndex?: number;
}

const DEFAULT_SPOTS = [
  { x: 50, y: 38 },
  { x: 37, y: 52 },
  { x: 63, y: 52 },
];

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";

const CATEGORY_INFO: Record<
  StickerCategory,
  { labelEn: string; hint: string; badgeCls: string }
> = {
  small: {
    labelEn: "Small — Logo / Icon",
    hint: "Up to 200×200 px · Logos, icons, small symbols",
    badgeCls: "bg-shell text-smoke",
  },
  medium: {
    labelEn: "Medium — Name / Half-sheet",
    hint: "Up to 400×400 px · Names, text or half-page images",
    badgeCls: "bg-gold/20 text-ink",
  },
  large: {
    labelEn: "Large — Full sheet (A4)",
    hint: "Up to 800×800 px · Large statement prints",
    badgeCls: "bg-moss/15 text-moss",
  },
};

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
  const [placements, setPlacements] = useState<StickerPlacement[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [customStickers, setCustomStickers] = useState<ApiSticker[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [face, setFace] = useState<"front" | "back">("front");
  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [sizeModal, setSizeModal] = useState<SizeCategoryModal | null>(null);
  // Sticker style editor — opens when clicking a sticker in the picker
  const [stickerEditor, setStickerEditor] = useState<StickerEditorState | null>(null);

  const wizardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stickers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { custom?: ApiSticker[] } | null) => {
        if (!cancelled && d?.custom) setCustomStickers(d.custom);
      })
      .catch(() => {});
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: unknown } | null) => {
        if (!cancelled) setSignedIn(Boolean(d?.user));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fit = getFit(fitId);
  const color = getTeeColor(colorId);
  const fitName = lang === "ta" ? fit.nameTa : fit.nameEn;
  const colorName = lang === "ta" ? color.nameTa : color.nameEn;
  const scales = placements.map((p) => p.scale);
  const unitPrice = calcCustomUnitPrice(fitId, scales);
  const designTotal = scales.reduce((s, sc) => s + priceForScale(sc), 0);
  const total = unitPrice * qty;
  const selectedPlacement = selectedIndex !== null ? (placements[selectedIndex] ?? null) : null;

  const stepLabels: { value: Step; label: string }[] = [
    { value: 1, label: t.custom.step1 },
    { value: 2, label: t.custom.step2 },
    { value: 3, label: t.custom.step3 },
    { value: 4, label: t.custom.step4 },
  ];

  // ── Navigation ────────────────────────────────────────────────────
  function scrollToWizard() {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    window.requestAnimationFrame(() =>
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function goToStep(next: Step) {
    setStep(next);
    setStepError(null);
    scrollToWizard();
  }

  function handleContinue() {
    if (step === 1 && !size) { setStepError(t.product.selectSizeError); return; }
    if (step === 3 && placements.length === 0) { setStepError(t.custom.stickersRequired); return; }
    if (step === 4) return;
    const next = (step + 1) as Step;
    setStep(next);
    setMaxStep((c) => (next > c ? next : c));
    setStepError(null);
    scrollToWizard();
  }

  function handleBack() {
    if (step === 1) return;
    goToStep((step - 1) as Step);
  }

  // ── Placements ────────────────────────────────────────────────────
  function addPlacement(ref: string, category: StickerCategory, style?: StickerStyle) {
    if (placements.length >= MAX_PLACEMENTS) {
      setStepError(fill(t.custom.stickersLimit, { max: MAX_PLACEMENTS }));
      return;
    }
    const spot = DEFAULT_SPOTS[placements.length % DEFAULT_SPOTS.length];
    const newPlacement: StickerPlacement = {
      ref,
      x: spot.x,
      y: spot.y,
      scale: CATEGORY_DEFAULT_SCALE[category],
      rotation: 0,
      ...(style && style.bgShape !== "none" ? { style: { bgShape: style.bgShape, bgColor: style.bgColor } } : {}),
    };
    setPlacements((c) => [...c, newPlacement]);
    setSelectedIndex(placements.length);
    setStepError(null);
  }

  function updatePlacement(index: number, patch: Partial<StickerPlacement>) {
    setPlacements((c) => c.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function handleMove(index: number, x: number, y: number) {
    updatePlacement(index, { x, y });
  }

  function removePlacement(index: number) {
    setPlacements((c) => c.filter((_, i) => i !== index));
    setSelectedIndex(null);
  }

  // ── Sticker picker click → open style editor ──────────────────────
  function handleStickerClick(ref: string, category: StickerCategory) {
    // If already placed, open editor on existing placement instead
    const existingIndex = placements.findIndex((p) => p.ref === ref);
    if (existingIndex >= 0) {
      // Remove it (toggle off)
      removePlacement(existingIndex);
      return;
    }
    // Open style editor before placing
    setStickerEditor({ ref, category });
  }

  function handleStickerEditorConfirm(style: StickerStyle) {
    if (!stickerEditor) return;
    setStickerEditor(null);
    addPlacement(stickerEditor.ref, stickerEditor.category, style);
  }

  function handleStickerEditorCancel() {
    setStickerEditor(null);
  }

  // ── Edit style of an already-placed sticker ───────────────────────
  function openEditPlacedSticker(index: number) {
    const p = placements[index];
    if (!p) return;
    const parsed = parsePlacementRef(p.ref);
    if (!parsed) return;
    setStickerEditor({
      ref: p.ref,
      category: "small", // category doesn't matter for editing existing
      existingIndex: index,
    });
  }

  function handleExistingStyleConfirm(style: StickerStyle) {
    if (!stickerEditor || stickerEditor.existingIndex === undefined) return;
    updatePlacement(stickerEditor.existingIndex, {
      style: style.bgShape !== "none" ? { bgShape: style.bgShape, bgColor: style.bgColor } : undefined,
    });
    setStickerEditor(null);
  }

  // ── Image upload flow ─────────────────────────────────────────────
  function handleFileSelected(file: File) {
    setImageEditorFile(file);
  }

  function handleEditorSave(blob: Blob, fileName: string) {
    const editedFile = new File([blob], fileName, { type: "image/png" });
    setImageEditorFile(null);
    setSizeModal({ file: editedFile, pending: false });
  }

  function handleEditorCancel() {
    setImageEditorFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadWithCategory(file: File, category: StickerCategory) {
    if (placements.length >= MAX_PLACEMENTS) {
      setStepError(fill(t.custom.stickersLimit, { max: MAX_PLACEMENTS }));
      setSizeModal(null);
      return;
    }
    setSizeModal((p) => (p ? { ...p, pending: true } : null));
    setUploading(true);
    setStepError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    try {
      const res = await fetch("/api/custom-upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { path?: string; error?: string } | null;
      if (res.ok && data?.path) {
        addPlacement(data.path, category);
      } else {
        setStepError(getErrorMessage(t, data?.error ?? "SERVER_ERROR"));
      }
    } catch {
      setStepError(getErrorMessage(t, "NETWORK_ERROR"));
    } finally {
      setUploading(false);
      setSizeModal(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Cart / checkout ───────────────────────────────────────────────
  function handleAddToCart() {
    if (!size) { setStep(1); setStepError(t.product.selectSizeError); scrollToWizard(); return; }
    addCustom({ fit: fitId, size, colorId, placements }, qty);
    showToast({
      title: t.custom.addedToast,
      description: fill(t.custom.addedDesc, { fit: fitName, color: colorName, size }),
      href: "/cart",
      hrefLabel: t.toasts.viewCart,
    });
  }

  function handleBuyNow() {
    if (!size) { setStep(1); setStepError(t.product.selectSizeError); scrollToWizard(); return; }
    addCustom({ fit: fitId, size, colorId, placements }, qty);
    router.push("/checkout");
  }

  function placementName(ref: string): string {
    const parsed = parsePlacementRef(ref);
    if (!parsed) return "";
    if (parsed.type === "image") return t.custom.yourImage;
    const sticker = getSticker(parsed.id);
    return lang === "ta" ? sticker.nameTa : sticker.nameEn;
  }

  const customByCategory: Record<StickerCategory, ApiSticker[]> = {
    small:  customStickers.filter((s) => s.category === "small"),
    medium: customStickers.filter((s) => s.category === "medium"),
    large:  customStickers.filter((s) => s.category === "large"),
  };
  const hasCustomStickers = customStickers.length > 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* Image editor modal */}
      {imageEditorFile ? (
        <ImageEditor
          file={imageEditorFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      ) : null}

      {/* Sticker style editor modal */}
      {stickerEditor ? (
        <StickerStyleEditor
          stickerRef={stickerEditor.ref}
          onConfirm={
            stickerEditor.existingIndex !== undefined
              ? handleExistingStyleConfirm
              : handleStickerEditorConfirm
          }
          onCancel={handleStickerEditorCancel}
        />
      ) : null}

      {/* Size category modal */}
      {sizeModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose image size"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          onClick={() => !sizeModal.pending && setSizeModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-line bg-paper p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold tracking-[-0.02em]">
                  How big is this image?
                </h3>
                <p className="mt-1 text-[12px] text-smoke">
                  Choose how it will be printed on the tee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSizeModal(null)}
                disabled={sizeModal.pending}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {(["small", "medium", "large"] as StickerCategory[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={sizeModal.pending}
                    onClick={() => handleUploadWithCategory(sizeModal.file, cat)}
                    className="flex flex-col gap-1 rounded-2xl border border-line bg-paper p-3.5 text-left transition hover:border-ink/40 hover:bg-shell/50 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]", info.badgeCls)}>
                        {cat}
                      </span>
                      <span className="text-[13px] font-semibold">{info.labelEn}</span>
                    </span>
                    <span className="text-[11px] leading-relaxed text-smoke">{info.hint}</span>
                  </button>
                );
              })}
            </div>
            {sizeModal.pending ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-smoke">
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-12">

        {/* ── Left: shirt preview / canvas ─────────────────────────── */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-line bg-paper p-4 sm:p-5 lg:rounded-[2rem] lg:p-6">

            {/* Shirt display */}
            <div className="mx-auto w-full max-w-[310px]">
              {step === 3 ? (
                <TeeCanvas
                  colorId={colorId}
                  placements={placements}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  onMove={handleMove}
                  face={face}
                  showGuidelines={showGuidelines}
                  allow3DRotate
                />
              ) : (
                <TeePreview colorId={colorId} placements={placements} />
              )}
            </div>

            {/* Chips summary */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <span className="chip px-2.5 py-1 text-[10px]">{fitName}</span>
              {size && <span className="chip px-2.5 py-1 text-[10px]">{size}</span>}
              <span className="chip gap-1 px-2.5 py-1 text-[10px]">
                <span className="h-2.5 w-2.5 rounded-full border border-ink/10" style={{ backgroundColor: color.hex }} />
                {colorName}
              </span>
              {placements.length > 0 && (
                <span className="chip px-2.5 py-1 text-[10px]">
                  {fill(t.custom.stickersSelected, { count: placements.length, max: MAX_PLACEMENTS })}
                </span>
              )}
            </div>

            {/* Step 3 canvas controls */}
            {step === 3 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setFace((f) => (f === "front" ? "back" : "front"))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-smoke transition hover:border-ink/40 hover:text-ink"
                >
                  <FlipHorizontal2 size={13} />
                  {face === "front" ? "View back" : "View front"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuidelines((g) => !g)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
                    showGuidelines
                      ? "border-rust/60 bg-rust/10 text-rust"
                      : "border-line bg-paper text-smoke hover:border-ink/40 hover:text-ink",
                  )}
                >
                  <Grid3x3 size={13} />
                  {showGuidelines ? "Hide guides" : "Show guides"}
                </button>
              </div>
            ) : null}

            {/* Step 3 hint */}
            {step === 3 ? (
              <p className="mt-2 text-center text-[10.5px] text-smoke">
                Drag to place stickers · Drag the shirt to rotate it in 3D
              </p>
            ) : null}

            {/* Selected placement controls */}
            {step === 3 && selectedPlacement && selectedIndex !== null ? (
              <div className="mt-4 rounded-2xl border border-line bg-shell/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold">
                    {placementName(selectedPlacement.ref)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditPlacedSticker(selectedIndex)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium text-smoke transition hover:bg-shell hover:text-ink"
                    >
                      <Pencil size={11} />
                      Style
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlacement(selectedIndex)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium text-smoke transition hover:bg-rust/5 hover:text-rust"
                    >
                      <Trash2 size={12} />
                      {t.custom.removePlacement}
                    </button>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="flex items-center justify-between text-[10.5px] font-medium text-smoke">
                    {t.custom.placementSizeLabel}
                    <span className="font-semibold text-ink">
                      {selectedPlacement.scale >= FULL_SCALE_THRESHOLD
                        ? fill(t.custom.fullPrice, { price: formatINR(priceForScale(selectedPlacement.scale)) })
                        : fill(t.custom.halfPrice, { price: formatINR(priceForScale(selectedPlacement.scale)) })}
                    </span>
                  </span>
                  <input
                    type="range" min={MIN_SCALE} max={MAX_SCALE} step={0.05}
                    value={selectedPlacement.scale}
                    onChange={(e) => updatePlacement(selectedIndex, { scale: Number(e.target.value) })}
                    className="mt-1.5 w-full accent-ink"
                  />
                </label>
                <label className="mt-2.5 block">
                  <span className="flex items-center justify-between text-[10.5px] font-medium text-smoke">
                    {t.custom.rotateLabel}
                    <span className="font-semibold text-ink">{Math.round(selectedPlacement.rotation)}°</span>
                  </span>
                  <input
                    type="range" min={MIN_ROTATION} max={MAX_ROTATION} step={1}
                    value={selectedPlacement.rotation}
                    onChange={(e) => updatePlacement(selectedIndex, { rotation: Number(e.target.value) })}
                    className="mt-1.5 w-full accent-ink"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
              <span className="text-[11px] text-smoke">{t.custom.total}</span>
              <span className="font-display text-lg font-bold tracking-[-0.02em]">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: step wizard ─────────────────────────────────────── */}
        <div ref={wizardRef} className="scroll-mt-24">
          {/* Step nav */}
          <div className="flex items-start justify-between gap-1 sm:gap-2" aria-label={fill(t.custom.stepOf, { current: step })}>
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
                  <span className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border text-[11px] font-bold transition sm:h-9 sm:w-9",
                    isActive ? "border-ink bg-ink text-paper"
                    : isDone ? "border-ink/25 bg-paper text-ink"
                    : "border-line bg-shell text-smoke",
                  )}>
                    {isDone && !isActive ? <Check size={13} /> : item.value}
                  </span>
                  <span className={cn(
                    "text-center text-[9.5px] font-medium leading-tight transition sm:text-[11px]",
                    isActive ? "text-ink"
                    : reachable ? "text-smoke group-hover:text-ink"
                    : "text-smoke/50",
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step content — NO key={step} here to prevent remounting */}
          <div className="mt-5 rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
              {fill(t.custom.stepOf, { current: step })}
            </p>

            {/* ── Step 1: Fit & Size ────────────────────────────────── */}
            {step === 1 ? (
              <div className="animate-fade-in">
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
                          selected ? "border-ink bg-ink/[0.03] ring-1 ring-ink" : "border-line bg-paper hover:border-ink/30",
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {lang === "ta" ? option.nameTa : option.nameEn}
                          </span>
                          <span className="shrink-0 text-[13px] font-semibold">{formatINR(option.price)}</span>
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
                  <div role="group" aria-label={t.custom.sizeLabel} className="mt-2.5 grid grid-cols-5 gap-2">
                    {SIZES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setSize(option); setStepError(null); }}
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

            {/* ── Step 2: Colour ────────────────────────────────────── */}
            {step === 2 ? (
              <div className="animate-fade-in">
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {t.custom.colourLabel}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-smoke">{t.custom.colourHint}</p>
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
                          selected ? "border-ink bg-ink/[0.03] ring-1 ring-ink" : "border-line bg-paper hover:border-ink/30",
                        )}
                      >
                        <span
                          className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/10 sm:h-11 sm:w-11"
                          style={{ backgroundColor: option.hex }}
                        >
                          {selected && (
                            <Check
                              size={16}
                              strokeWidth={2.6}
                              className={option.tone === "dark" ? "text-paper" : "text-ink"}
                            />
                          )}
                        </span>
                        <span className="text-[10.5px] font-medium leading-tight sm:text-[11px]">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── Step 3: Stickers ─────────────────────────────────── */}
            {step === 3 ? (
              <div className="animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                      {t.custom.stickersLabel}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-smoke">{t.custom.stickersHint}</p>
                  </div>
                  {placements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPlacements([]); setSelectedIndex(null); setStepError(null); }}
                      className="shrink-0 text-[11px] font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink"
                    >
                      {t.custom.clearStickers}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-shell px-2.5 py-1 text-[10px] font-semibold text-smoke">
                    {fill(t.custom.stickersSelected, { count: placements.length, max: MAX_PLACEMENTS })}
                  </span>
                  <span className="text-[10px] text-smoke">
                    {fill(t.custom.priceNote, { half: formatINR(59), full: formatINR(100) })}
                  </span>
                </div>

                {/* Built-in stickers */}
                <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-smoke">
                  {t.custom.libraryLabel}
                </h3>
                <p className="mt-0.5 text-[10px] text-smoke/70">
                  Tap to style &amp; place · Tap again to remove
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                  {STICKERS.map((sticker) => {
                    const ref = `builtin:${sticker.id}`;
                    const isPlaced = placements.some((p) => p.ref === ref);
                    const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
                    return (
                      <button
                        key={sticker.id}
                        type="button"
                        onClick={() => handleStickerClick(ref, "small")}
                        aria-pressed={isPlaced}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition sm:p-2.5",
                          isPlaced
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
                        <span className="text-[10.5px] font-semibold leading-tight">{name}</span>
                        {isPlaced ? (
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
                            <Check size={11} strokeWidth={2.6} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Custom DB stickers grouped by category */}
                {hasCustomStickers && (
                  <div className="mt-5 space-y-4">
                    {(["small", "medium", "large"] as StickerCategory[]).map((cat) => {
                      const items = customByCategory[cat];
                      if (!items.length) return null;
                      const info = CATEGORY_INFO[cat];
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]", info.badgeCls)}>
                              {cat}
                            </span>
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.10em] text-smoke">
                              {info.labelEn}
                            </h4>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {items.map((sticker) => {
                              const ref = sticker.image;
                              const isPlaced = placements.some((p) => p.ref === ref);
                              const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
                              return (
                                <button
                                  key={sticker.id}
                                  type="button"
                                  onClick={() => handleStickerClick(ref, sticker.category)}
                                  aria-pressed={isPlaced}
                                  className={cn(
                                    "relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition sm:p-2.5",
                                    isPlaced
                                      ? "border-ink bg-ink/[0.03] ring-1 ring-ink"
                                      : "border-line bg-paper hover:border-ink/30",
                                  )}
                                >
                                  <span className="grid aspect-square w-full max-w-[62px] place-items-center overflow-hidden rounded-xl bg-shell p-1">
                                    <img src={sticker.image} alt={name} className="h-full w-full object-contain" draggable={false} />
                                  </span>
                                  <span className="text-[10.5px] font-semibold leading-tight">{name}</span>
                                  {isPlaced && (
                                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
                                      <Check size={11} strokeWidth={2.6} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload image */}
                <div className="mt-4 rounded-2xl border border-dashed border-ink/25 bg-shell/40 p-3.5">
                  {signedIn ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelected(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={buttonClass({ variant: "outline", size: "sm" })}
                      >
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        {uploading ? t.custom.uploading : t.custom.uploadLabel}
                      </button>
                      <p className="mt-2 text-[10.5px] leading-relaxed text-smoke">
                        PNG, JPG, WebP · up to 6 MB. Background is removed automatically. You can also adjust colours before placing.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Link href="/login?next=%2Fcustomize" className={buttonClass({ variant: "outline", size: "sm" })}>
                        <Upload size={15} />
                        {t.custom.uploadLabel}
                      </Link>
                      <p className="mt-2 text-[10.5px] leading-relaxed text-smoke">{t.custom.loginToUpload}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* ── Step 4: Review ────────────────────────────────────── */}
            {step === 4 ? (
              <div className="animate-fade-in">
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {t.custom.reviewTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-smoke">{t.custom.reviewText}</p>

                <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">{t.custom.reviewFit}</span>
                    <span className="text-right text-[13px] font-medium">{fitName}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">{t.custom.reviewSize}</span>
                    <span className="text-right text-[13px] font-medium">{size ?? "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-smoke">{t.custom.reviewColour}</span>
                    <span className="flex items-center gap-1.5 text-right text-[13px] font-medium">
                      <span className="h-3 w-3 rounded-full border border-ink/10" style={{ backgroundColor: color.hex }} />
                      {colorName}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="shrink-0 text-xs text-smoke">{t.custom.reviewStickers}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {placements.length === 0 ? (
                        <span className="text-[13px] font-medium">—</span>
                      ) : (
                        placements.map((placement, index) => {
                          const parsed = parsePlacementRef(placement.ref);
                          return (
                            <span
                              key={`${placement.ref}-${index}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pl-0.5 pr-2 text-[10.5px] font-medium"
                            >
                              {parsed?.type === "image" ? (
                                <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-shell p-0.5">
                                  <img src={placement.ref} alt="" className="h-full w-full object-contain" draggable={false} />
                                </span>
                              ) : parsed?.type === "builtin" ? (
                                <span className="grid h-5 w-5 place-items-center rounded-full p-0.5" style={{ backgroundColor: getSticker(parsed.id).bg }}>
                                  <StickerArt sticker={getSticker(parsed.id)} />
                                </span>
                              ) : null}
                              {placementName(placement.ref)}
                              <span className="text-[9.5px] text-smoke">{formatINR(priceForScale(placement.scale))}</span>
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
                    <span className="text-smoke">{fill(t.custom.stickersPrice, { count: placements.length })}</span>
                    <span className="font-medium">+{formatINR(designTotal)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-[13px] font-semibold">{t.custom.quantity}</span>
                    <QuantityStepper value={qty} onChange={setQty} small />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm font-semibold">
                      {t.custom.total}
                      {qty > 1 && <span className="ml-1 text-[11px] font-normal text-smoke">× {qty}</span>}
                    </span>
                    <span className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">{formatINR(total)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
                  <button type="button" onClick={handleAddToCart} className={buttonClass({ size: "lg" })}>
                    <ShoppingBag size={17} />
                    {t.custom.addToCart}
                  </button>
                  <button type="button" onClick={handleBuyNow} className={buttonClass({ variant: "rust", size: "lg" })}>
                    <Zap size={16} />
                    {t.custom.buyNow}
                  </button>
                </div>
              </div>
            ) : null}

            {stepError && <p role="alert" className="error-text mt-3">{stepError}</p>}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
              {step > 1 ? (
                <button type="button" onClick={handleBack} className={buttonClass({ variant: "ghost", size: "sm" })}>
                  <ArrowLeft size={15} />
                  {t.custom.back}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-smoke">
                  <Sparkles size={13} className="text-rust" />
                  {t.custom.previewNote}
                </span>
              )}
              {step < 4 && (
                <button type="button" onClick={handleContinue} className={buttonClass({ size: "md" })}>
                  {t.custom.continue}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
