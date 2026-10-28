"use client";

/**
 * ImageEditor — browser-side logo/image editor
 *
 * Features:
 *  • Remove background (via @imgly/background-removal WASM — runs locally, no API key)
 *  • Background colour picker
 *  • Background shape: transparent | circle | rounded-square | square
 *  • Brightness / Contrast / Saturation CSS-filter sliders
 *  • Export final result as PNG blob
 *
 * Usage:
 *  <ImageEditor file={file} onSave={(blob) => ...} onCancel={() => ...} />
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  RefreshCcw,
  Square,
  SquareDashedIcon,
  Trash2,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────
type BgShape = "transparent" | "circle" | "rounded" | "square";

interface Adjustments {
  brightness: number; // 0–200 (100 = neutral)
  contrast: number;   // 0–200
  saturation: number; // 0–200
}

const DEFAULT_ADJ: Adjustments = { brightness: 100, contrast: 100, saturation: 100 };

const PRESET_COLORS = [
  "#FFFFFF", "#F7F2E9", "#171512", "#C8542F",
  "#E9B44C", "#59634C", "#26374F", "#6C2E38",
  "#A9C3D6", "#D8C2A4", "#F0CBD2", "#EAD8B7",
];

// ── Helpers ───────────────────────────────────────────────────────────
function cssFilter(adj: Adjustments): string {
  return `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
}

/** Draw the source image (optionally filtered) onto a canvas and return a blob */
async function renderToBlob(
  source: HTMLImageElement | HTMLCanvasElement,
  bgColor: string | null,
  bgShape: BgShape,
  adj: Adjustments,
  size: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background
  if (bgShape !== "transparent" && bgColor) {
    ctx.fillStyle = bgColor;
    if (bgShape === "circle") {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (bgShape === "rounded") {
      const r = size * 0.2;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.quadraticCurveTo(size, 0, size, r);
      ctx.lineTo(size, size - r);
      ctx.quadraticCurveTo(size, size, size - r, size);
      ctx.lineTo(r, size);
      ctx.quadraticCurveTo(0, size, 0, size - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }
  }

  // Apply CSS filter via off-screen canvas trick
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = size;
  tmpCanvas.height = size;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.filter = cssFilter(adj);
  tmpCtx.drawImage(source, 0, 0, size, size);

  // Clip to shape before drawing filtered image
  if (bgShape === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tmpCanvas, 0, 0);
    ctx.restore();
  } else if (bgShape === "rounded") {
    const r = size * 0.2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tmpCanvas, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(tmpCanvas, 0, 0);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob returned null"));
    }, "image/png");
  });
}

// ── Component ─────────────────────────────────────────────────────────
export function ImageEditor({
  file,
  onSave,
  onCancel,
}: {
  file: File;
  onSave: (blob: Blob, fileName: string) => void;
  onCancel: () => void;
}) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [noBgUrl, setNoBgUrl] = useState<string | null>(null);
  const [noBgCanvas, setNoBgCanvas] = useState<HTMLCanvasElement | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  const [bgShape, setBgShape] = useState<BgShape>("transparent");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);

  const [saving, setSaving] = useState(false);
  const [showAdj, setShowAdj] = useState(false);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load the original file as an object URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    // Pre-load into an Image element
    const img = new Image();
    img.onload = () => { imgRef.current = img; redrawPreview(img, null); };
    img.src = url;

    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Redraw preview canvas whenever settings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const redrawPreview = useCallback(
    (
      source: HTMLImageElement | HTMLCanvasElement,
      _noBg: HTMLCanvasElement | null,
    ) => {
      const canvas = previewRef.current;
      if (!canvas) return;
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, size, size);

      // Checkerboard pattern (transparency indicator)
      const checkSize = 12;
      for (let y = 0; y < size; y += checkSize) {
        for (let x = 0; x < size; x += checkSize) {
          ctx.fillStyle =
            (x / checkSize + y / checkSize) % 2 === 0 ? "#e0e0e0" : "#f8f8f8";
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      // Background shape fill
      if (bgShape !== "transparent") {
        ctx.fillStyle = bgColor;
        if (bgShape === "circle") {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (bgShape === "rounded") {
          const r = size * 0.2;
          ctx.beginPath();
          ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
          ctx.quadraticCurveTo(size, 0, size, r);
          ctx.lineTo(size, size - r);
          ctx.quadraticCurveTo(size, size, size - r, size);
          ctx.lineTo(r, size);
          ctx.quadraticCurveTo(0, size, 0, size - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, size, size);
        }
      }

      // Draw image with clip + filter
      const drawSource = _noBg ?? source;
      if (bgShape === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.filter = cssFilter(adj);
        ctx.drawImage(drawSource, 0, 0, size, size);
        ctx.restore();
      } else if (bgShape === "rounded") {
        const r = size * 0.2;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();
        ctx.filter = cssFilter(adj);
        ctx.drawImage(drawSource, 0, 0, size, size);
        ctx.restore();
      } else {
        ctx.filter = cssFilter(adj);
        ctx.drawImage(drawSource, 0, 0, size, size);
        ctx.filter = "none";
      }
    },
    [bgShape, bgColor, adj],
  );

  // Re-draw whenever deps change
  useEffect(() => {
    const source = noBgCanvas ?? imgRef.current;
    if (!source) return;
    redrawPreview(source, noBgCanvas);
  }, [bgShape, bgColor, adj, noBgCanvas, redrawPreview]);

  // ── Background removal ────────────────────────────────────────────
  async function handleRemoveBg() {
    if (removingBg) return;
    setRemovingBg(true);
    setBgError(null);
    try {
      // Dynamic import — downloads the WASM model on first use
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        publicPath: "/bg-removal/",
      });
      const url = URL.createObjectURL(blob);
      setNoBgUrl(url);
      setBgRemoved(true);

      // Convert the blob to an HTMLCanvasElement so we can use it in render
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        setNoBgCanvas(c);
        redrawPreview(c, c);
      };
      img.src = url;
    } catch (err) {
      console.error("BG removal failed", err);
      setBgError(
        "Background removal failed. Check your connection — the model file downloads on first use (~40 MB).",
      );
    } finally {
      setRemovingBg(false);
    }
  }

  function handleResetBg() {
    if (noBgUrl) URL.revokeObjectURL(noBgUrl);
    setNoBgUrl(null);
    setNoBgCanvas(null);
    setBgRemoved(false);
    if (imgRef.current) redrawPreview(imgRef.current, null);
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const source = noBgCanvas ?? imgRef.current!;
      const blob = await renderToBlob(source, bgColor, bgShape, adj, 800);
      const ext = bgShape === "transparent" && bgRemoved ? "png" : "png";
      onSave(blob, `edited-${Date.now()}.${ext}`);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setSaving(false);
    }
  }

  const SHAPES: { id: BgShape; label: string; Icon: React.ElementType }[] = [
    { id: "transparent", label: "None", Icon: X },
    { id: "circle", label: "Circle", Icon: Circle },
    { id: "rounded", label: "Rounded", Icon: SquareDashedIcon },
    { id: "square", label: "Square", Icon: Square },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="flex h-[95dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-line bg-paper sm:h-auto sm:max-h-[90dvh] sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold tracking-[-0.02em] sm:text-lg">
              Edit image
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              Remove background, choose a shape and adjust colours.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close editor"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative rounded-2xl bg-shell p-3">
              <canvas
                ref={previewRef}
                width={300}
                height={300}
                className="block max-w-full rounded-xl"
                style={{ width: 220, height: 220 }}
              />
              {removingBg ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-paper/85">
                  <Loader2 size={22} className="animate-spin text-rust" />
                  <span className="text-[11px] font-medium text-smoke">
                    Removing background…
                  </span>
                  <span className="max-w-[160px] text-center text-[10px] text-smoke/70">
                    Downloads ~40 MB model on first use
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Background removal */}
          <div className="rounded-2xl border border-line bg-shell/50 p-3.5">
            <p className="text-[11px] font-semibold text-ink">Background removal</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-smoke">
              Runs locally in your browser — no data is sent to any server.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {!bgRemoved ? (
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  disabled={removingBg}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  {removingBg ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  {removingBg ? "Working…" : "Remove background"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetBg}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  <RefreshCcw size={13} />
                  Restore original background
                </button>
              )}
            </div>
            {bgError ? (
              <p className="mt-2 text-[10.5px] font-medium text-rust">{bgError}</p>
            ) : null}
            {bgRemoved ? (
              <p className="mt-2 text-[10.5px] text-moss">
                ✓ Background removed. You can now add a colour or shape below.
              </p>
            ) : null}
          </div>

          {/* Background shape */}
          <div>
            <p className="text-[11px] font-semibold text-ink">Background shape</p>
            <div className="mt-2 flex gap-2">
              {SHAPES.map(({ id, label, Icon }) => {
                const active = bgShape === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBgShape(id)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-[10px] font-medium transition",
                      active
                        ? "border-ink bg-ink/[0.04] ring-1 ring-ink"
                        : "border-line bg-paper hover:border-ink/30",
                    )}
                  >
                    <Icon size={18} strokeWidth={1.6} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background colour (only shown when shape is not transparent) */}
          {bgShape !== "transparent" ? (
            <div>
              <p className="text-[11px] font-semibold text-ink">Background colour</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBgColor(hex)}
                    aria-label={hex}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      bgColor === hex
                        ? "border-ink scale-110 shadow-md"
                        : "border-line hover:scale-105",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* Custom colour picker */}
                <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-smoke/50 hover:border-ink/40">
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-smoke">
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
              <p className="mt-1.5 text-[10px] text-smoke">{bgColor}</p>
            </div>
          ) : null}

          {/* Adjustments accordion */}
          <div className="rounded-2xl border border-line overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdj((s) => !s)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[11px] font-semibold text-ink">
                Adjustments
              </span>
              {showAdj ? (
                <ChevronDown size={15} className="text-smoke" />
              ) : (
                <ChevronRight size={15} className="text-smoke" />
              )}
            </button>

            {showAdj ? (
              <div className="border-t border-line px-4 pb-4 pt-3 space-y-4">
                {(
                  [
                    { key: "brightness", label: "Brightness", min: 0, max: 200 },
                    { key: "contrast", label: "Contrast", min: 0, max: 200 },
                    { key: "saturation", label: "Saturation", min: 0, max: 200 },
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
                      step={5}
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
                  className="text-[10.5px] font-medium text-smoke underline underline-offset-4 hover:text-ink"
                >
                  Reset adjustments
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-4">
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
            disabled={saving}
            className={buttonClass({ size: "sm" })}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {saving ? "Saving…" : "Use this image"}
          </button>
        </div>
      </div>
    </div>
  );
}
