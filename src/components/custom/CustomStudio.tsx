"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlipHorizontal2,
  Grid3x3,
  Image as ImageIcon,
  Loader2,
  ShoppingBag,
  Sparkles,
  Type,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { TeeCanvas } from "@/components/custom/TeeCanvas";
import { ImageEditor } from "@/components/custom/ImageEditor";
import { PlacementEditor } from "@/components/custom/PlacementEditor";
import { StickerArt } from "@/components/tee/StickerArt";
import { TeePreview } from "@/components/tee/TeePreview";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SizeGuideDialog } from "@/components/ui/SizeGuideDialog";
import { buttonClass } from "@/components/ui/button";
import {
  FITS,
  MAX_PLACEMENTS,
  SIZES,
  STICKERS,
  TEE_COLORS,
  calcCustomUnitPrice,
  getCategoryFromScale,
  getFit,
  getSticker,
  getTeeColor,
  isStickerId,
  parsePlacementRef,
} from "@/lib/catalog";
import type { FitId, Size, StickerCategory, TeeColorId } from "@/lib/catalog";
import type { StickerPlacement } from "@/lib/types";
import type { SavedDesignConfig } from "@/lib/types";
import { fill, formatINR } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";

function uid() { return Math.random().toString(36).slice(2); }

type Step = 1 | 2 | 3 | 4;

interface ApiSticker {
  id: string;
  nameEn: string;
  nameTa: string;
  image: string;
  category: StickerCategory;
}

// State for the sticker-style editor dialog — REMOVED (now inline in PlacementEditor)


const DEFAULT_SPOTS = [
  { x: 50, y: 38 },
  { x: 37, y: 52 },
  { x: 63, y: 52 },
  { x: 50, y: 64 },
  { x: 33, y: 38 },
  { x: 67, y: 38 },
  { x: 50, y: 26 },
  { x: 38, y: 64 },
  { x: 62, y: 64 },
  { x: 50, y: 50 },
];

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";

const CATEGORY_INFO: Record<
  StickerCategory,
  { labelEn: string; hint: string; badgeCls: string }
> = {
  small: {
    labelEn: "Small — Logos & Badges",
    hint: "Chest logos, pocket badges & symbols (~16% scale)",
    badgeCls: "bg-shell text-smoke border border-line",
  },
  medium: {
    labelEn: "Medium — Graphic Designs (Half A4)",
    hint: "Typographic art, retro crests & chest graphics (~38% scale)",
    badgeCls: "bg-gold/20 text-ink border border-gold/40",
  },
  large: {
    labelEn: "Big — Full A4 Sheet (Anime & Characters)",
    hint: "Full A4 statement prints, anime titans & trending characters (~60% scale)",
    badgeCls: "bg-rose-500/15 text-rose-700 border border-rose-300 dark:text-rose-300",
  },
};

export function CustomStudio({ initialDesignId }: { initialDesignId: string | null }) {
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
  const [userDesigns, setUserDesigns] = useState<{ id: string; imageId: string; image: string; name: string; category: string }[]>([]);
  const [categoryTab, setCategoryTab] = useState<StickerCategory>("small");
  const [signedIn, setSignedIn] = useState(false);
  const [designLoaded, setDesignLoaded] = useState(false);
  const [designId, setDesignId] = useState<string | null>(initialDesignId);
  const [designSaveState, setDesignSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [designName, setDesignName] = useState("Untitled design");
  const [uploading, setUploading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [face, setFace] = useState<"front" | "back">("front");
  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [uploadModeFile, setUploadModeFile] = useState<File | null>(null);
  // text add modal
  const [showTextModal, setShowTextModal] = useState(false);
  const [textDraft, setTextDraft] = useState("");

  const wizardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const designIdRef = useRef<string | null>(initialDesignId);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    async function loadStudio() {
      let studioReady = false;
      try {
        const [stickersResponse, authResponse] = await Promise.all([
          fetch("/api/stickers"),
          fetch("/api/auth/me"),
        ]);
        if (stickersResponse.ok) {
          const stickers = (await stickersResponse.json()) as { custom?: ApiSticker[] };
          if (!cancelled && stickers.custom) setCustomStickers(stickers.custom);
        }
        const auth = authResponse.ok
          ? (await authResponse.json()) as { user?: unknown }
          : null;
        if (!auth?.user) {
          if (!cancelled) setSignedIn(false);
          return;
        }
        if (cancelled) return;
        setSignedIn(true);

        const imagesResponse = await fetch("/api/user-designs");
        if (!imagesResponse.ok) throw new Error("Could not load your image library.");
        const imagesData = (await imagesResponse.json()) as {
          designs?: { id: string; imageId: string; image: string; name: string; category: string }[];
        };
        if (!cancelled && imagesData.designs) setUserDesigns(imagesData.designs);

        if (initialDesignId) {
          const designResponse = await fetch(`/api/user-designs/${encodeURIComponent(initialDesignId)}`);
          if (!designResponse.ok) {
            router.replace("/user-designs");
            return;
          }
          const result = (await designResponse.json()) as {
            design?: { id: string; name: string; config: SavedDesignConfig | null };
          };
          const design = result.design;
          if (!design?.config) throw new Error("Saved design is missing its configuration.");
          if (cancelled) return;
          const config = design.config;
          setDesignId(design.id);
          designIdRef.current = design.id;
          setDesignName(design.name || "Untitled design");
          setFitId(config.fit);
          setSize(config.size);
          setColorId(config.colorId);
          setPlacements(config.placements);
          setStep(config.placements.length > 0 ? 3 : 1);
          setMaxStep(config.placements.length > 0 ? 3 : 1);
          lastSavedSnapshotRef.current = JSON.stringify({
            name: design.name || "Untitled design",
            config,
          });
        } else {
          lastSavedSnapshotRef.current = JSON.stringify({
            name: "Untitled design",
            config: { fit: "regular", size: null, colorId: "cream", placements: [] },
          });
        }
        studioReady = true;
      } catch (error) {
        console.error("Could not load custom design studio", error);
        if (!cancelled) setStepError(getErrorMessage(t, "SERVER_ERROR"));
      } finally {
        if (!cancelled) setDesignLoaded(studioReady);
      }
    }
    void loadStudio();
    return () => { cancelled = true; };
  }, [initialDesignId, router, t]);


  const fit = getFit(fitId);
  const color = getTeeColor(colorId);
  const fitName = lang === "ta" ? fit.nameTa : fit.nameEn;
  const colorName = lang === "ta" ? color.nameTa : color.nameEn;
  const scales = placements.map((p) => p.scale);
  const unitPrice = calcCustomUnitPrice(fitId, scales);
  const designTotal = scales.reduce((s, sc) => s + (sc > 48 ? 100 : 59), 0);
  const total = unitPrice * qty;
  const selectedPlacement = selectedIndex !== null ? (placements[selectedIndex] ?? null) : null;

  useEffect(() => {
    if (!designLoaded || !signedIn) return;

    const config: SavedDesignConfig = { fit: fitId, size, colorId, placements };
    const name = designName || "Untitled design";
    const snapshot = JSON.stringify({ name, config });
    if (snapshot === lastSavedSnapshotRef.current) return;
    if (
      !designIdRef.current &&
      size === null &&
      placements.length === 0 &&
      fitId === "regular" &&
      colorId === "cream"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDesignSaveState("saving");
      const save = async () => {
        try {
          const currentId = designIdRef.current;
          const response = await fetch(
            currentId
              ? `/api/user-designs/${encodeURIComponent(currentId)}`
              : "/api/user-designs",
            {
              method: currentId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, config }),
            },
          );
          const result = await response.json().catch(() => null) as {
            design?: { id?: string };
            error?: string;
          } | null;
          if (!response.ok) throw new Error(result?.error ?? "SERVER_ERROR");

          if (!currentId) {
            const createdId = result?.design?.id;
            if (!createdId) throw new Error("Saved design response did not include an ID.");
            designIdRef.current = createdId;
            setDesignId(createdId);
            window.history.replaceState(
              null,
              "",
              `/customize?design=${encodeURIComponent(createdId)}`,
            );
          }
          lastSavedSnapshotRef.current = snapshot;
          setDesignSaveState("saved");
        } catch (error) {
          console.error("Could not auto-save custom design", error);
          setDesignSaveState("error");
          showToast({
            title: t.toasts.errorTitle,
            description: getErrorMessage(
              t,
              error instanceof Error ? error.message : "SERVER_ERROR",
            ),
            tone: "error",
          });
        }
      };
      saveQueueRef.current = saveQueueRef.current.then(save, save);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [
    colorId,
    designLoaded,
    designName,
    fitId,
    placements,
    router,
    showToast,
    signedIn,
    size,
    t,
  ]);

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
  function addPlacement(ref: string, category: StickerCategory) {
    if (placements.length >= MAX_PLACEMENTS) {
      setStepError(fill(t.custom.stickersLimit, { max: MAX_PLACEMENTS }));
      return;
    }
    const sameFaceCount = placements.filter((p) => (p.face ?? "front") === face).length;
    const spot = DEFAULT_SPOTS[sameFaceCount % DEFAULT_SPOTS.length];
    const defaultScalePct =
      category === "small" ? 16 :
      category === "large" ? 60 : 38;
    const newPlacement: StickerPlacement = {
      ref,
      x: spot.x,
      y: spot.y,
      scale: defaultScalePct,
      rotation: 0,
      face,
    };
    setPlacements((c) => [...c, newPlacement]);
    setSelectedIndex(placements.length);
    setStepError(null);
  }

  function updatePlacement(index: number, patch: Partial<StickerPlacement>) {
    if (patch.face) {
      setFace(patch.face);
    }
    setPlacements((c) => c.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function handleMove(index: number, x: number, y: number) {
    updatePlacement(index, { x, y });
  }

  function handleResize(index: number, scale: number) {
    updatePlacement(index, { scale });
  }

  function handleRotate(index: number, rotation: number) {
    updatePlacement(index, { rotation });
  }

  function removePlacement(index: number) {
    setPlacements((c) => c.filter((_, i) => i !== index));
    setSelectedIndex(null);
  }

  // ── Sticker picker click → direct place (no pre-editor) ──────────
  function handleStickerClick(ref: string, category: StickerCategory) {
    const existingIndex = placements.findIndex(
      (p) => p.ref === ref && (p.face ?? "front") === face,
    );
    if (existingIndex >= 0) {
      removePlacement(existingIndex);
      return;
    }
    addPlacement(ref, category);
  }

  // ── Add text placement ────────────────────────────────────────────
  function handleAddText() {
    if (!textDraft.trim()) return;
    if (placements.length >= MAX_PLACEMENTS) {
      setStepError(fill(t.custom.stickersLimit, { max: MAX_PLACEMENTS }));
      return;
    }
    const sameFaceCount = placements.filter((p) => (p.face ?? "front") === face).length;
    const spot = DEFAULT_SPOTS[sameFaceCount % DEFAULT_SPOTS.length];
    const newPlacement: StickerPlacement = {
      ref: `text:${uid()}`,
      x: spot.x,
      y: spot.y,
      scale: 32,
      rotation: 0,
      face,
      text: {
        content: textDraft.trim(),
        fontFamily: "sans",
        color: "#171512",
        bold: false,
        italic: false,
      },
    };
    setPlacements((c) => [...c, newPlacement]);
    setSelectedIndex(placements.length);
    setTextDraft("");
    setShowTextModal(false);
    setStepError(null);
  }

  // ── Image upload flow ─────────────────────────────────────────────
  async function checkImageHasTransparency(file: File): Promise<boolean> {
    if (!file.type.includes("png") && !file.type.includes("webp") && !file.type.includes("gif") && !file.type.includes("svg")) {
      return false;
    }
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const w = Math.min(128, bmp.width);
      const h = Math.min(128, bmp.height);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return false;
      ctx.drawImage(bmp, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 240) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleFileSelected(file: File) {
    const isTransparent = await checkImageHasTransparency(file);
    if (isTransparent) {
      // Image already has a transparent background — place it directly, no extra steps.
      // Its print size is decided by how the customer resizes it on the tee,
      // not by a prompt: the scale they settle on maps to Small / Medium / Big.
      await handleUploadWithCategory(file);
      return;
    }
    setUploadModeFile(file);
  }

  function handleUseFullImage() {
    if (!uploadModeFile) return;
    const file = uploadModeFile;
    setUploadModeFile(null);
    void handleUploadWithCategory(file);
  }

  function handleExtractDesign() {
    if (!uploadModeFile) return;
    setImageEditorFile(uploadModeFile);
    setUploadModeFile(null);
  }

  function handleUploadModeCancel() {
    setUploadModeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleEditorSave(blob: Blob, fileName: string) {
    const editedFile = new File([blob], fileName, { type: "image/png" });
    setImageEditorFile(null);
    void handleUploadWithCategory(editedFile);
  }

  function handleEditorCancel() {
    setImageEditorFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadWithCategory(file: File) {
    if (placements.length >= MAX_PLACEMENTS) {
      setStepError(fill(t.custom.stickersLimit, { max: MAX_PLACEMENTS }));
      return;
    }
    // No "how big?" prompt: the upload lands at a medium starting scale and
    // the customer resizes it. Small/Medium/Big is derived live from that
    // scale (getCategoryFromScale), including the price tier.
    const category: StickerCategory = "medium";
    setUploading(true);
    setStepError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    try {
      const res = await fetch("/api/custom-upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { id?: string; path?: string; error?: string } | null;
      if (res.ok && data?.path) {
        addPlacement(data.path, category);
        if (data.id) {
          setUserDesigns((prev) => [{ id: data.id!, imageId: data.id!, image: data.path!, name: "", category }, ...prev]);
        }
      } else {
        setStepError(getErrorMessage(t, data?.error ?? "SERVER_ERROR"));
      }
    } catch {
      setStepError(getErrorMessage(t, "NETWORK_ERROR"));
    } finally {
      setUploading(false);
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

  function placementName(ref: string, placement?: StickerPlacement): string {
    const parsed = parsePlacementRef(ref);
    if (!parsed) return "";
    if (parsed.type === "image") return t.custom.yourImage;
    if (parsed.type === "text") {
      const content = placement?.text?.content || "";
      return content ? `"${content.slice(0, 15)}"` : "Text";
    }
    const sticker = getSticker(parsed.id);
    return lang === "ta" ? sticker.nameTa : sticker.nameEn;
  }

  const uniqueCustomStickers = useMemo<ApiSticker[]>(() => {
    const seen = new Set<string>();
    return customStickers.filter((s: ApiSticker) => {
      const key = s.nameEn.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customStickers]);

  const customByCategory: Record<StickerCategory, ApiSticker[]> = {
    small:  uniqueCustomStickers.filter((s) => s.category === "small"),
    medium: uniqueCustomStickers.filter((s) => s.category === "medium"),
    large:  uniqueCustomStickers.filter((s) => s.category === "large"),
  };
  const hasCustomStickers = uniqueCustomStickers.length > 0;

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

      {/* Add text modal */}
      {showTextModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add text"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          onClick={() => setShowTextModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-line bg-paper p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-bold tracking-tight">Add text to your tee</h3>
            <p className="mt-0.5 text-[11px] text-smoke">Type something — your name, a word, anything.</p>
            <textarea
              rows={3}
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="e.g. Vijay · Chennai · 2025"
              autoFocus
              className="mt-3 w-full resize-none rounded-2xl border border-line bg-shell px-4 py-3 text-[14px] text-ink placeholder:text-smoke/50 focus:border-ink/60 focus:outline-none"
              maxLength={120}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAddText(); }}
            />
            <p className="mt-1 text-right text-[10px] text-smoke">{textDraft.length}/120</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTextModal(false)} className={buttonClass({ variant: "ghost", size: "sm" })}>Cancel</button>
              <button type="button" onClick={handleAddText} disabled={!textDraft.trim()} className={buttonClass({ size: "sm" })}>
                <Type size={13} />
                Add text
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload mode selector modal */}
      {uploadModeFile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose upload mode"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          onClick={handleUploadModeCancel}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-line bg-paper p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold tracking-[-0.02em]">
                  How do you want to use this image?
                </h3>
                <p className="mt-1 text-[12px] text-smoke">
                  Place it as-is, or extract just the logo / design.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUploadModeCancel}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview thumbnail */}
            <div className="mt-4 flex justify-center">
              <div className="h-[100px] w-[100px] overflow-hidden rounded-2xl border border-line bg-shell">
                <img
                  src={URL.createObjectURL(uploadModeFile)}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {/* Option 1: Use full image */}
              <button
                type="button"
                onClick={handleUseFullImage}
                className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3.5 text-left transition hover:border-ink/40 hover:bg-shell/50"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-shell text-smoke">
                  <ImageIcon size={16} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">Use full image</span>
                  <span className="text-[11px] leading-relaxed text-smoke">
                    Place the entire photo on the tee as-is — no background removal.
                  </span>
                </span>
              </button>

              {/* Option 2: Extract design */}
              <button
                type="button"
                onClick={handleExtractDesign}
                className="flex items-start gap-3 rounded-2xl border border-ink/25 bg-ink/[0.02] p-3.5 text-left transition hover:border-ink/40 hover:bg-shell/50"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rust/10 text-rust">
                  <Wand2 size={16} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">Extract design</span>
                  <span className="text-[11px] leading-relaxed text-smoke">
                    Remove the background, crop to a logo, or pick a colour to erase — get just the design.
                  </span>
                </span>
              </button>
            </div>
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
                  onResize={handleResize}
                  onRotate={handleRotate}
                  face={face}
                  showGuidelines={showGuidelines}
                  allow3DRotate
                />
              ) : (
                <TeePreview colorId={colorId} placements={placements} face={face} />
              )}
            </div>

            {/* Interactive chips summary */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5" role="toolbar" aria-label="Selected configuration">
              <button
                type="button"
                onClick={() => goToStep(1)}
                title="Change fit (Step 1)"
                className="chip group cursor-pointer px-2.5 py-1 text-[10px] transition-all hover:border-ink hover:bg-shell active:scale-95"
              >
                <span>{fitName}</span>
                <span className="ml-1 text-[9px] text-smoke opacity-60 group-hover:opacity-100">✎</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(1)}
                title="Change size (Step 1)"
                className="chip group cursor-pointer px-2.5 py-1 text-[10px] transition-all hover:border-ink hover:bg-shell active:scale-95"
              >
                <span>{size ?? "Size"}</span>
                <span className="ml-1 text-[9px] text-smoke opacity-60 group-hover:opacity-100">✎</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(2)}
                title="Change colour (Step 2)"
                className="chip group cursor-pointer gap-1 px-2.5 py-1 text-[10px] transition-all hover:border-ink hover:bg-shell active:scale-95"
              >
                <span className="h-2.5 w-2.5 rounded-full border border-ink/10" style={{ backgroundColor: color.hex }} />
                <span>{colorName}</span>
                <span className="ml-0.5 text-[9px] text-smoke opacity-60 group-hover:opacity-100">✎</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(3)}
                title="Edit stickers (Step 3)"
                className="chip group cursor-pointer px-2.5 py-1 text-[10px] transition-all hover:border-ink hover:bg-shell active:scale-95"
              >
                <span>
                  {fill(t.custom.stickersSelected, { count: placements.length, max: MAX_PLACEMENTS })}
                </span>
                <span className="ml-1 text-[9px] text-smoke opacity-60 group-hover:opacity-100">✎</span>
              </button>
            </div>

            {/* Shirt view & canvas controls */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFace((f) => (f === "front" ? "back" : "front"));
                  setSelectedIndex(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-smoke transition hover:border-ink/40 hover:text-ink shadow-xs"
              >
                <FlipHorizontal2 size={13} />
                {face === "front" ? "View back" : "View front"}
              </button>
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => setShowGuidelines((g) => !g)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition shadow-xs",
                    showGuidelines
                      ? "border-rust/60 bg-rust/10 text-rust"
                      : "border-line bg-paper text-smoke hover:border-ink/40 hover:text-ink",
                  )}
                >
                  <Grid3x3 size={13} />
                  {showGuidelines ? "Hide guides" : "Show guides"}
                </button>
              )}
            </div>

            {/* Step 3 hint */}
            {step === 3 ? (
              <p className="mt-2 text-center text-[10.5px] text-smoke">
                Drag to place stickers · Drag the shirt to rotate it in 3D
              </p>
            ) : null}

            {/* PlacementEditor — shown when a sticker/text is selected */}
            {step === 3 && selectedIndex !== null && placements[selectedIndex] ? (
              <div className="mt-3">
                <PlacementEditor
                  placement={placements[selectedIndex]}
                  index={selectedIndex}
                  onChange={updatePlacement}
                  onRemove={removePlacement}
                />
              </div>
            ) : step === 3 && placements.length > 0 ? (
              <p className="mt-2 text-center text-[10px] text-smoke/60">
                Tap a sticker on the shirt to edit it
              </p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
                {fill(t.custom.stepOf, { current: step })}
              </p>
              {signedIn ? (
                <p
                  aria-live="polite"
                  className={cn(
                    "text-[10px] font-medium",
                    designSaveState === "error" ? "text-rust" : "text-smoke",
                  )}
                >
                  {designSaveState === "saving"
                    ? t.custom.designSaving
                    : designSaveState === "error"
                      ? t.custom.designSaveError
                      : designId
                        ? t.custom.designSaved
                        : t.custom.designAutoSave}
                </p>
              ) : null}
            </div>

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

                {/* 3 Sticker Categories Tabs — one category visible at a time */}
                <div className="mt-4 flex flex-wrap gap-1.5 border-b border-line pb-3">
                  {[
                    { id: "small", label: "Small (Logos & Icons)" },
                    { id: "medium", label: "Medium (Half A4 Designs)" },
                    { id: "large", label: "Big (Full A4 / Anime)" },
                  ].map((tab) => {
                    const isActive = categoryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategoryTab(tab.id as StickerCategory)}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                          isActive
                            ? "border border-ink bg-ink text-paper shadow-xs"
                            : "border border-line bg-shell/80 text-smoke hover:border-ink/40 hover:text-ink",
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Categorized Sticker Library */}
                <div className="mt-4 space-y-6">
                  {(["small", "medium", "large"] as StickerCategory[]).map((cat) => {
                    if (categoryTab !== cat) return null;
                    const info = CATEGORY_INFO[cat];
                    const builtinItems = STICKERS.filter((s) => s.category === cat);
                    const customItems = customByCategory[cat] ?? [];

                    return (
                      <div key={cat} className="space-y-2.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]", info.badgeCls)}>
                            {cat === "large" ? "Big / Full A4" : cat}
                          </span>
                          <h3 className="text-[12px] font-bold tracking-tight text-ink">
                            {info.labelEn}
                          </h3>
                        </div>
                        <p className="text-[10px] text-smoke">
                          {info.hint}
                        </p>

                        <div className={cn(
                          "grid gap-2 sm:gap-2.5",
                          cat === "small" ? "grid-cols-3 sm:grid-cols-4" :
                          cat === "medium" ? "grid-cols-2 sm:grid-cols-3" :
                          "grid-cols-2 sm:grid-cols-3",
                        )}>
                          {hasCustomStickers ? (
                            customItems.length === 0 ? (
                              <p className="col-span-full py-4 text-center text-[11px] text-smoke">
                                No stickers in this category yet.
                              </p>
                            ) : (
                              customItems.map((sticker) => {
                                const ref = sticker.image;
                                const isPlaced = placements.some((p) => p.ref === ref && (p.face ?? "front") === face);
                                const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
                                return (
                                  <button
                                    key={sticker.id}
                                    type="button"
                                    onClick={() => handleStickerClick(ref, cat)}
                                    aria-pressed={isPlaced}
                                    className={cn(
                                      "group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition cursor-pointer",
                                      isPlaced
                                        ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                                        : "border-line bg-paper hover:border-ink/40 hover:bg-shell/30 hover:shadow-xs",
                                    )}
                                  >
                                    <span className={cn(
                                      "grid place-items-center overflow-hidden rounded-xl bg-shell p-1.5 transition group-hover:scale-105",
                                      cat === "small" ? "aspect-square w-full max-w-[62px]" :
                                      cat === "medium" ? "aspect-[4/3] w-full max-w-[110px]" :
                                      "aspect-[3/4] w-full max-w-[120px]",
                                    )}>
                                      <img src={sticker.image} alt={name} className="h-full w-full object-contain" draggable={false} />
                                    </span>
                                    <span className="text-[10.5px] font-semibold leading-tight text-ink">{name}</span>
                                    <span className="text-[9px] text-smoke">
                                      {cat === "large" ? "Full A4 (₹100)" : cat === "medium" ? "Half A4 (₹59)" : "Pocket logo (₹59)"}
                                    </span>
                                    {isPlaced && (
                                      <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper shadow-xs">
                                        <Check size={11} strokeWidth={2.6} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )
                          ) : (
                            builtinItems.map((sticker) => {
                              const ref = `builtin:${sticker.id}`;
                              const isPlaced = placements.some((p) => p.ref === ref && (p.face ?? "front") === face);
                              const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
                              return (
                                <button
                                  key={sticker.id}
                                  type="button"
                                  onClick={() => handleStickerClick(ref, cat)}
                                  aria-pressed={isPlaced}
                                  className={cn(
                                    "group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition cursor-pointer",
                                    isPlaced
                                      ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                                      : "border-line bg-paper hover:border-ink/40 hover:bg-shell/30 hover:shadow-xs",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "grid place-items-center rounded-xl p-2 transition group-hover:scale-105",
                                      cat === "small" ? "aspect-square w-full max-w-[62px]" :
                                      cat === "medium" ? "aspect-[4/3] w-full max-w-[110px]" :
                                      "aspect-[3/4] w-full max-w-[120px] p-2.5",
                                    )}
                                    style={{ backgroundColor: sticker.bg }}
                                  >
                                    <StickerArt sticker={sticker} />
                                  </span>
                                  <span className="text-[10.5px] font-semibold leading-tight text-ink">{name}</span>
                                  <span className="text-[9px] text-smoke">
                                    {cat === "large" ? "Full A4 (₹100)" : cat === "medium" ? "Half A4 (₹59)" : "Pocket logo (₹59)"}
                                  </span>
                                  {isPlaced ? (
                                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper shadow-xs">
                                      <Check size={11} strokeWidth={2.6} />
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add text */}
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-shell/40 px-4 py-3">
                  <Type size={16} className="shrink-0 text-smoke" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-ink">Add text to your tee</p>
                    <p className="text-[10px] text-smoke">Names, words, anything you like.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTextModal(true)}
                    disabled={placements.length >= MAX_PLACEMENTS}
                    className={buttonClass({ variant: "outline", size: "sm" })}
                  >
                    + Add
                  </button>
                </div>

                {/* Your Designs Library */}
                {signedIn && userDesigns.length > 0 ? (
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[12px] font-bold tracking-tight text-ink">
                        {t.custom.yourDesigns}
                      </h3>
                      <span className="text-[10px] text-smoke">
                        {userDesigns.length} saved
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-smoke">
                      {t.custom.yourDesignsHint}
                    </p>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {userDesigns.map((design) => {
                        const ref = design.image;
                        const isPlaced = placements.some((p) => p.ref === ref && (p.face ?? "front") === face);
                        const cat = design.category === "large" ? "large" : design.category === "small" ? "small" : "medium";
                        return (
                          <div key={design.id} className="relative">
                            <button
                              type="button"
                              onClick={() => handleStickerClick(ref, cat as import("@/lib/catalog").StickerCategory)}
                              aria-pressed={isPlaced}
                              className={cn(
                                "group flex w-full flex-col items-center gap-1 rounded-2xl border p-2 text-center transition cursor-pointer",
                                isPlaced
                                  ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                                  : "border-line bg-paper hover:border-ink/40 hover:bg-shell/30 hover:shadow-xs",
                              )}
                            >
                              <span className="grid aspect-square w-full max-w-[80px] place-items-center overflow-hidden rounded-xl bg-shell p-1.5 transition group-hover:scale-105">
                                <img src={design.image} alt={design.name || t.custom.yourImage} className="h-full w-full object-contain" draggable={false} />
                              </span>
                              {design.name ? (
                                <span className="text-[10px] font-medium leading-tight text-ink truncate w-full">{design.name}</span>
                              ) : null}
                              {isPlaced && (
                                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper shadow-xs">
                                  <Check size={11} strokeWidth={2.6} />
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await fetch(`/api/user-designs/${design.id}`, {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                  });
                                  setUserDesigns((prev) => prev.filter((d) => d.id !== design.id));
                                } catch {}
                              }}
                              className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-paper border border-line text-smoke shadow-xs transition hover:bg-rust hover:text-paper hover:border-rust"
                              aria-label={t.custom.deleteDesign}
                            >
                              <X size={10} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

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
                          const catInfo = getCategoryFromScale(placement.scale);
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
                              {placementName(placement.ref, placement)}
                              <span className="rounded bg-shell px-1 py-0.2 text-[8.5px] uppercase font-semibold text-smoke">
                                {(placement.face ?? "front") === "back" ? "Back" : "Front"}
                              </span>
                              <span className={cn("rounded px-1.5 py-0.2 text-[8.5px] font-bold uppercase", catInfo.badgeCls)}>
                                {catInfo.labelShort}
                              </span>
                              <span className="text-[9.5px] text-smoke">
                                ₹{catInfo.price}
                              </span>
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
