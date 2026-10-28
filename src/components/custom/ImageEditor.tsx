"use client";

/**
 * ImageEditor — full in-browser image editor
 *
 * Flow:
 *   1. Mount  → immediately start background removal (auto, no click needed)
 *   2. While removing → show progress with animated preview of original
 *   3. Done  → show transparent PNG result live on canvas
 *   4. Customer can then:
 *        • Keep transparent OR add a background colour + shape
 *        • Flip / mirror the image horizontally
 *        • Adjust brightness / contrast / saturation / opacity
 *        • Crop to a square (centred)
 *   5. "Place on tee" → exports PNG blob → size-category prompt → upload → tee canvas
 *
 * All processing runs in the browser via:
 *   • @imgly/background-removal  (WASM, ~40 MB model, no API key)
 *   • HTML Canvas 2D API
 *   • CSS filters
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Crop,
  FlipHorizontal,
  Loader2,
  RefreshCcw,
  Sliders,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────────
type BgShape = "transparent" | "circle" | "rounded" | "square";

interface Adjustments {
  brightness: number;  // 50–150  (100 = neutral)
  contrast: number;    // 50–150
  saturation: number;  // 0–200
  opacity: number;     // 10–100
}

const DEFAULT_ADJ: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
};

const PRESET_BG_COLORS = [
  "#FFFFFF", "#F7F2E9", "#171512", "#C8542F",
  "#E9B44C", "#59634C", "#26374F", "#6C2E38",
  "#A9C3D6", "#D8C2A4", "#F0CBD2", "#EAD8B7",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
];

// ── Canvas helpers ─────────────────────────────────────────────────────────────

/** Build a CSS filter string from adjustments */
function toFilter(adj: Adjustments): string {
  return (
    `brightness(${adj.brightness}%) ` +
    `contrast(${adj.contrast}%) ` +
    `saturate(${adj.saturation}%)`
  );
}

/** Clip path helper — applies shape clipping to a 2D context */
function clipShape(ctx: CanvasRenderingContext2D, size: number, shape: BgShape) {
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === "rounded") {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.arcTo(size, 0, size, r, r);
    ctx.lineTo(size, size - r);
    ctx.arcTo(size, size, size - r, size, r);
    ctx.lineTo(r, size);
    ctx.arcTo(0, size, 0, size - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.clip();
  }
}

/** Fill background shape */
function fillShape(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: BgShape,
  color: string,
) {
  if (shape === "transparent") return;
  ctx.fillStyle = color;
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "rounded") {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.arcTo(size, 0, size, r, r);
    ctx.lineTo(size, size - r);
    ctx.arcTo(size, size, size - r, size, r);
    ctx.lineTo(r, size);
    ctx.arcTo(0, size, 0, size - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }
}

/** Draw checkerboard (transparency indicator) */
function drawCheckerboard(ctx: CanvasRenderingContext2D, size: number) {
  const sq = 10;
  for (let y = 0; y < size; y += sq) {
    for (let x = 0; x < size; x += sq) {
      ctx.fillStyle =
        (Math.floor(x / sq) + Math.floor(y / sq)) % 2 === 0 ? "#d8d8d8" : "#f2f2f2";
      ctx.fillRect(x, y, sq, sq);
    }
  }
}

/**
 * Composite the working image (source: ImageBitmap) with all settings applied
 * onto the given canvas. Returns nothing — draws in place.
 */
function composite(
  canvas: HTMLCanvasElement,
  source: ImageBitmap,
  opts: {
    bgShape: BgShape;
    bgColor: string;
    adj: Adjustments;
    flipped: boolean;
    cropped: boolean;
  },
) {
  const { bgShape, bgColor, adj, flipped, cropped } = opts;
  const SIZE = canvas.width;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // 1. Checkerboard (shows through transparent areas)
  drawCheckerboard(ctx, SIZE);

  // 2. Background shape fill
  fillShape(ctx, SIZE, bgShape, bgColor);

  // 3. Draw image with filter + flip + optional crop
  ctx.save();
  if (bgShape !== "square" && bgShape !== "transparent") {
    clipShape(ctx, SIZE, bgShape);
  }

  ctx.globalAlpha = adj.opacity / 100;
  ctx.filter = toFilter(adj);

  const srcW = source.width;
  const srcH = source.height;

  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  if (cropped) {
    // Centre-crop to square
    if (srcW > srcH) {
      sx = (srcW - srcH) / 2;
      sw = srcH;
    } else {
      sy = (srcH - srcW) / 2;
      sh = srcW;
    }
  }

  if (flipped) {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
  ctx.restore();
}

/**
 * Export the final image as a PNG Blob at full quality (800px).
 * Does NOT draw the checkerboard — clean output only.
 */
async function exportBlob(
  source: ImageBitmap,
  opts: {
    bgShape: BgShape;
    bgColor: string;
    adj: Adjustments;
    flipped: boolean;
    cropped: boolean;
  },
): Promise<Blob> {
  const SIZE = 800;
  const { bgShape, bgColor, adj, flipped, cropped } = opts;
  const offscreen = document.createElement("canvas");
  offscreen.width = SIZE;
  offscreen.height = SIZE;
  const ctx = offscreen.getContext("2d")!;

  fillShape(ctx, SIZE, bgShape, bgColor);

  const srcW = source.width;
  const srcH = source.height;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  if (cropped) {
    if (srcW > srcH) { sx = (srcW - srcH) / 2; sw = srcH; }
    else { sy = (srcH - srcW) / 2; sh = srcW; }
  }

  ctx.save();
  if (bgShape !== "square" && bgShape !== "transparent") {
    clipShape(ctx, SIZE, bgShape);
  }
  ctx.globalAlpha = adj.opacity / 100;
  ctx.filter = toFilter(adj);
  if (flipped) { ctx.translate(SIZE, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
  ctx.restore();

  return new Promise<Blob>((res, rej) => {
    offscreen.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png");
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

type EditorPhase =
  | "loading"       // loading original file
  | "removing-bg"   // WASM model running
  | "ready"         // editing
  | "bg-error";     // removal failed, still editable with original

export function ImageEditor({
  file,
  onSave,
  onCancel,
}: {
  file: File;
  onSave: (blob: Blob, fileName: string) => void;
  onCancel: () => void;
}) {
  // ── State ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<EditorPhase>("loading");
  const [bgError, setBgError] = useState<string | null>(null);

  // The working ImageBitmap (original or bg-removed)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  // Whether the bitmap has bg removed
  const [bgRemoved, setBgRemoved] = useState(false);

  // Editor settings
  const [bgShape, setBgShape] = useState<BgShape>("transparent");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [flipped, setFlipped] = useState(false);
  const [cropped, setCropped] = useState(false);

  // Panel open state
  const [adjOpen, setAdjOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const previewRef = useRef<HTMLCanvasElement>(null);
  // Keep a ref to the latest bitmap so effects don't go stale
  const bitmapRef = useRef<ImageBitmap | null>(null);

  // ── Draw preview whenever anything changes ─────────────────────────
  const draw = useCallback(() => {
    const canvas = previewRef.current;
    const bmp = bitmapRef.current;
    if (!canvas || !bmp) return;
    composite(canvas, bmp, { bgShape, bgColor, adj, flipped, cropped });
  }, [bgShape, bgColor, adj, flipped, cropped]);

  // Use layout effect so the canvas is always in sync before paint
  useLayoutEffect(() => {
    draw();
  }, [draw]);

  // ── Step 1: load original → Step 2: auto-remove bg ────────────────
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Load the file into an ImageBitmap
      let original: ImageBitmap;
      try {
        original = await createImageBitmap(file);
      } catch {
        onCancel();
        return;
      }
      if (cancelled) return;

      // Show the original immediately while we remove bg
      bitmapRef.current = original;
      setBitmap(original);
      setPhase("removing-bg");

      // ── Auto background removal ──────────────────────────────────
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const resultBlob = await removeBackground(file, {
          publicPath: "/bg-removal/",
        });
        if (cancelled) return;

        const bmp = await createImageBitmap(resultBlob);
        if (cancelled) { bmp.close(); return; }

        bitmapRef.current = bmp;
        setBitmap(bmp);
        setBgRemoved(true);
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        console.warn("BG removal failed", err);
        setBgError(
          "Auto background removal failed — your original image is shown. " +
          "Try again or skip and place the image as-is.",
        );
        setPhase("bg-error");
      }
    }

    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Re-draw when bitmap changes
  useEffect(() => {
    bitmapRef.current = bitmap;
    draw();
  }, [bitmap, draw]);

  // ── Manual bg removal retry ────────────────────────────────────────
  async function handleRetryBgRemoval() {
    setBgError(null);
    setPhase("removing-bg");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(file, { publicPath: "/bg-removal/" });
      const bmp = await createImageBitmap(resultBlob);
      bitmapRef.current = bmp;
      setBitmap(bmp);
      setBgRemoved(true);
      setPhase("ready");
    } catch (err) {
      console.warn("BG removal retry failed", err);
      setBgError("Still couldn't remove the background. You can place the image as-is.");
      setPhase("bg-error");
    }
  }

  // ── Restore original ───────────────────────────────────────────────
  async function handleRestoreOriginal() {
    try {
      const bmp = await createImageBitmap(file);
      bitmapRef.current = bmp;
      setBitmap(bmp);
      setBgRemoved(false);
      setPhase("ready");
    } catch { /* ignore */ }
  }

  // ── Save / export ──────────────────────────────────────────────────
  async function handleSave() {
    if (!bitmapRef.current) return;
    setSaving(true);
    try {
      const blob = await exportBlob(bitmapRef.current, {
        bgShape,
        bgColor,
        adj,
        flipped,
        cropped,
      });
      onSave(blob, `design-${Date.now()}.png`);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────
  const isProcessing = phase === "loading" || phase === "removing-bg";
  const isReady = phase === "ready" || phase === "bg-error";

  const phaseLabel =
    phase === "loading" ? "Loading image…" :
    phase === "removing-bg" ? "Extracting design…" :
    null;

  const SHAPES: { id: BgShape; label: string; node: React.ReactNode }[] = [
    {
      id: "transparent",
      label: "None",
      node: (
        <span className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-smoke/60 text-[8px] text-smoke">
          ✕
        </span>
      ),
    },
    {
      id: "circle",
      label: "Circle",
      node: <Circle size={18} strokeWidth={1.6} />,
    },
    {
      id: "rounded",
      label: "Rounded",
      node: (
        <span className="flex h-5 w-5 items-center justify-center rounded-lg border-2 border-current" />
      ),
    },
    {
      id: "square",
      label: "Square",
      node: <Square size={18} strokeWidth={1.6} />,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="flex h-[96dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-line bg-paper sm:h-auto sm:max-h-[92dvh] sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold tracking-[-0.02em] sm:text-lg">
              Edit your image
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              {isProcessing
                ? "Hang on — we're extracting your design from the background."
                : bgRemoved
                  ? "Background removed ✓ — adjust and place on your tee."
                  : "Adjust your image, then place it on the tee."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">

          {/* ── Live preview canvas ─────────────────────────────── */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer ring — shows current bg shape visually */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  bgShape === "circle" ? "rounded-full" :
                  bgShape === "rounded" ? "rounded-[22%]" :
                  bgShape === "square" ? "rounded-none" :
                  "rounded-2xl",
                )}
                style={{ width: 220, height: 220 }}
              >
                <canvas
                  ref={previewRef}
                  width={220}
                  height={220}
                  className="block h-full w-full"
                />
              </div>

              {/* Processing overlay */}
              {isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-paper/90 backdrop-blur-sm">
                  <div className="relative">
                    <Loader2 size={28} className="animate-spin text-rust" />
                  </div>
                  <span className="text-[12px] font-semibold text-ink">
                    {phaseLabel}
                  </span>
                  {phase === "removing-bg" ? (
                    <span className="max-w-[160px] text-center text-[10px] leading-relaxed text-smoke">
                      AI model runs in your browser. First use downloads ~40 MB.
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Bg-removed badge */}
              {bgRemoved && !isProcessing ? (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-moss/15 px-2.5 py-0.5 text-[9.5px] font-semibold text-moss">
                  Background removed ✓
                </span>
              ) : null}
            </div>
          </div>

          {/* ── BG removal status / error ───────────────────────── */}
          {bgError ? (
            <div className="rounded-2xl border border-rust/25 bg-rust/5 p-3.5">
              <p className="text-[11px] font-semibold text-rust">
                Background removal failed
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-smoke">
                {bgError}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRetryBgRemoval}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <RefreshCcw size={13} />
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Restore original (shown after bg removal) ───────── */}
          {bgRemoved && isReady ? (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-shell/50 px-3.5 py-3">
              <div>
                <p className="text-[11px] font-semibold text-ink">
                  Design extracted
                </p>
                <p className="mt-0.5 text-[10px] text-smoke">
                  Background has been removed automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreOriginal}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                <RefreshCcw size={13} />
                Restore original
              </button>
            </div>
          ) : null}

          {/* ── Quick actions (flip / crop) ──────────────────────── */}
          {isReady ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-pressed={flipped}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-medium transition",
                  flipped
                    ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                    : "border-line bg-paper hover:border-ink/30",
                )}
              >
                <FlipHorizontal size={15} strokeWidth={1.8} />
                {flipped ? "Unflip" : "Flip"}
              </button>
              <button
                type="button"
                onClick={() => setCropped((c) => !c)}
                aria-pressed={cropped}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-medium transition",
                  cropped
                    ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                    : "border-line bg-paper hover:border-ink/30",
                )}
              >
                <Crop size={15} strokeWidth={1.8} />
                {cropped ? "Uncrop" : "Crop square"}
              </button>
            </div>
          ) : null}

          {/* ── Background shape ─────────────────────────────────── */}
          {isReady ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-ink">
                Background shape
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SHAPES.map(({ id, label, node }) => {
                  const active = bgShape === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBgShape(id)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-[10px] font-medium transition",
                        active
                          ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                          : "border-line bg-paper hover:border-ink/30",
                      )}
                    >
                      {node}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Background colour (only when shape is not transparent) ── */}
          {isReady && bgShape !== "transparent" ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-ink">
                Background colour
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_BG_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBgColor(hex)}
                    aria-label={`Background colour ${hex}`}
                    title={hex}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      bgColor.toLowerCase() === hex.toLowerCase()
                        ? "scale-125 border-ink shadow"
                        : "border-line hover:scale-110 hover:border-ink/40",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* Custom colour */}
                <label
                  className="relative h-8 w-8 cursor-pointer rounded-full border-2 border-dashed border-smoke/50 hover:border-ink transition-transform hover:scale-110"
                  title="Custom colour"
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-smoke">
                    +
                  </span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Custom colour"
                  />
                </label>
              </div>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-smoke">
                {bgColor}
              </p>
            </div>
          ) : null}

          {/* ── Adjustments ──────────────────────────────────────── */}
          {isReady ? (
            <div className="overflow-hidden rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => setAdjOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-shell/40"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold text-ink">
                  <Sliders size={14} className="text-smoke" />
                  Adjustments
                  {JSON.stringify(adj) !== JSON.stringify(DEFAULT_ADJ) ? (
                    <span className="rounded-full bg-rust/15 px-1.5 py-0.5 text-[8.5px] font-bold text-rust">
                      edited
                    </span>
                  ) : null}
                </span>
                {adjOpen ? (
                  <ChevronDown size={15} className="text-smoke" />
                ) : (
                  <ChevronRight size={15} className="text-smoke" />
                )}
              </button>

              {adjOpen ? (
                <div className="space-y-4 border-t border-line px-4 pb-4 pt-3">
                  {(
                    [
                      { key: "brightness", label: "Brightness", min: 50, max: 150 },
                      { key: "contrast",   label: "Contrast",   min: 50, max: 150 },
                      { key: "saturation", label: "Saturation", min: 0,  max: 200 },
                      { key: "opacity",    label: "Opacity",    min: 10, max: 100 },
                    ] as const
                  ).map(({ key, label, min, max }) => (
                    <label key={key} className="block">
                      <span className="flex items-center justify-between text-[10.5px] font-medium text-smoke">
                        {label}
                        <span className="font-semibold text-ink">{adj[key]}%</span>
                      </span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={adj[key]}
                        onChange={(e) =>
                          setAdj((a) => ({ ...a, [key]: Number(e.target.value) }))
                        }
                        className="mt-1 w-full accent-ink"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdj(DEFAULT_ADJ)}
                    className="text-[10.5px] font-medium text-smoke underline underline-offset-4 transition hover:text-ink"
                  >
                    Reset to defaults
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isProcessing}
            className={buttonClass({ size: "sm" })}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {saving ? "Preparing…" :
             isProcessing ? "Processing…" :
             "Place on tee →"}
          </button>
        </div>
      </div>
    </div>
  );
}
