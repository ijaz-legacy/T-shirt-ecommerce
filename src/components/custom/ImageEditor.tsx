"use client";

/**
 * ImageEditor — full in-browser image editor with 3 logo/design extraction methods:
 *   1. Auto AI background removal (@imgly/background-removal WASM)
 *   2. Crop First (draw a box around the logo -> extract)
 *   3. Color Removal / Tap-to-select (flood fill contiguous or global color keying)
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Crop,
  FlipHorizontal,
  Loader2,
  Pipette,
  RefreshCcw,
  Sliders,
  Sparkles,
  Square,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────────
type BgShape = "transparent" | "circle" | "rounded" | "square";
type ActiveTool = "adjust" | "crop" | "color-erase";

interface Adjustments {
  brightness: number; // 50–150 (100 = neutral)
  contrast: number;   // 50–150
  saturation: number; // 0–200
  opacity: number;    // 10–100
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

function toFilter(adj: Adjustments): string {
  return (
    `brightness(${adj.brightness}%) ` +
    `contrast(${adj.contrast}%) ` +
    `saturate(${adj.saturation}%)`
  );
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function floodFillErase(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
) {
  const { width, height, data } = imageData;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  if (targetA === 0) return; // already transparent

  const maxDist = (tolerance / 100) * 442;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [startX + startY * width];
  visited[startX + startY * width] = 1;

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const px = idx % width;
    const py = Math.floor(idx / width);
    const pIdx = idx * 4;

    data[pIdx + 3] = 0;

    if (px > 0) {
      const n = idx - 1;
      if (!visited[n]) {
        visited[n] = 1;
        const np = n * 4;
        if (data[np + 3] > 0 && colorDist(targetR, targetG, targetB, data[np], data[np + 1], data[np + 2]) <= maxDist) {
          queue.push(n);
        }
      }
    }
    if (px < width - 1) {
      const n = idx + 1;
      if (!visited[n]) {
        visited[n] = 1;
        const np = n * 4;
        if (data[np + 3] > 0 && colorDist(targetR, targetG, targetB, data[np], data[np + 1], data[np + 2]) <= maxDist) {
          queue.push(n);
        }
      }
    }
    if (py > 0) {
      const n = idx - width;
      if (!visited[n]) {
        visited[n] = 1;
        const np = n * 4;
        if (data[np + 3] > 0 && colorDist(targetR, targetG, targetB, data[np], data[np + 1], data[np + 2]) <= maxDist) {
          queue.push(n);
        }
      }
    }
    if (py < height - 1) {
      const n = idx + width;
      if (!visited[n]) {
        visited[n] = 1;
        const np = n * 4;
        if (data[np + 3] > 0 && colorDist(targetR, targetG, targetB, data[np], data[np + 1], data[np + 2]) <= maxDist) {
          queue.push(n);
        }
      }
    }
  }
}

function globalColorErase(
  imageData: ImageData,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number,
) {
  const { data } = imageData;
  const maxDist = (tolerance / 100) * 442;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const dist = colorDist(targetR, targetG, targetB, data[i], data[i + 1], data[i + 2]);
    if (dist <= maxDist) {
      data[i + 3] = 0;
    }
  }
}

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

  drawCheckerboard(ctx, SIZE);
  fillShape(ctx, SIZE, bgShape, bgColor);

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
    if (srcW > srcH) {
      sx = (srcW - srcH) / 2;
      sw = srcH;
    } else {
      sy = (srcH - srcW) / 2;
      sh = srcW;
    }
  }

  // Preserve aspect ratio inside SIZE x SIZE
  const scale = Math.min(SIZE / sw, SIZE / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (SIZE - dw) / 2;
  const dy = (SIZE - dh) / 2;

  if (flipped) {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

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

  const scale = Math.min(SIZE / sw, SIZE / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (SIZE - dw) / 2;
  const dy = (SIZE - dh) / 2;

  ctx.save();
  if (bgShape !== "square" && bgShape !== "transparent") {
    clipShape(ctx, SIZE, bgShape);
  }
  ctx.globalAlpha = adj.opacity / 100;
  ctx.filter = toFilter(adj);
  if (flipped) { ctx.translate(SIZE, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();

  return new Promise<Blob>((res, rej) => {
    offscreen.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png");
  });
}

function checkBitmapHasTransparency(bmp: ImageBitmap): boolean {
  try {
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

// ── Component ──────────────────────────────────────────────────────────────────

type EditorPhase =
  | "loading"
  | "removing-bg"
  | "ready"
  | "bg-error";

export function ImageEditor({
  file,
  onSave,
  onCancel,
}: {
  file: File;
  onSave: (blob: Blob, fileName: string) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<EditorPhase>("loading");
  const [bgError, setBgError] = useState<string | null>(null);

  // Original pristine ImageBitmap
  const [originalBitmap, setOriginalBitmap] = useState<ImageBitmap | null>(null);
  // Current working ImageBitmap
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);

  // Undo history for color eraser & adjustments
  const [history, setHistory] = useState<ImageBitmap[]>([]);

  // Active Tool
  const [activeTool, setActiveTool] = useState<ActiveTool>("adjust");

  // Crop First State (proportions 0..1)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.15,
    y: 0.15,
    w: 0.7,
    h: 0.7,
  });
  const [croppingBusy, setCroppingBusy] = useState(false);

  // Color Eraser State
  const [eraseMode, setEraseMode] = useState<"flood" | "global">("flood");
  const [tolerance, setTolerance] = useState(25);
  const [colorEraseNotice, setColorEraseNotice] = useState<string | null>(null);

  // General settings
  const [bgShape, setBgShape] = useState<BgShape>("transparent");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [flipped, setFlipped] = useState(false);
  const [cropped, setCropped] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  // ── Draw preview ───────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = previewRef.current;
    const bmp = bitmapRef.current;
    if (!canvas || !bmp) return;
    composite(canvas, bmp, { bgShape, bgColor, adj, flipped, cropped });
  }, [bgShape, bgColor, adj, flipped, cropped]);

  useLayoutEffect(() => {
    draw();
  }, [draw]);

  // ── Step 1: load original → Step 2: auto-remove bg ────────────────
  useEffect(() => {
    let cancelled = false;

    async function run() {
      let original: ImageBitmap;
      try {
        original = await createImageBitmap(file);
      } catch {
        onCancel();
        return;
      }
      if (cancelled) return;

      setOriginalBitmap(original);
      bitmapRef.current = original;
      setBitmap(original);

      // If the image already has transparent background, keep it intact with no extra processing
      if (checkBitmapHasTransparency(original)) {
        setBgRemoved(true);
        setPhase("ready");
        return;
      }

      setPhase("removing-bg");

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
          "Auto background removal failed — your original image is shown. You can also use the Crop tool or Color Erase.",
        );
        setPhase("bg-error");
      }
    }

    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    bitmapRef.current = bitmap;
    draw();
  }, [bitmap, draw]);

  // ── Manual bg removal retry ────────────────────────────────────────
  async function handleRetryBgRemoval() {
    if (!originalBitmap) return;
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
      setBgError("Could not remove background automatically. Try the Crop or Color Erase tool.");
      setPhase("bg-error");
    }
  }

  // ── Restore original ───────────────────────────────────────────────
  async function handleRestoreOriginal() {
    if (!originalBitmap) return;
    try {
      const bmp = await createImageBitmap(file);
      bitmapRef.current = bmp;
      setBitmap(bmp);
      setBgRemoved(false);
      setHistory([]);
      setPhase("ready");
    } catch { /* ignore */ }
  }

  // ── Undo ───────────────────────────────────────────────────────────
  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    bitmapRef.current = previous;
    setBitmap(previous);
  }

  function pushHistory(bmp: ImageBitmap) {
    setHistory((h) => [...h.slice(-4), bmp]);
  }

  // ── Crop First Execution ───────────────────────────────────────────
  async function handleApplyCrop(withAiRemoval: boolean) {
    const src = originalBitmap || bitmap;
    if (!src) return;

    setCroppingBusy(true);
    setBgError(null);

    try {
      const sx = Math.max(0, Math.round(cropBox.x * src.width));
      const sy = Math.max(0, Math.round(cropBox.y * src.height));
      const sw = Math.min(src.width - sx, Math.max(10, Math.round(cropBox.w * src.width)));
      const sh = Math.min(src.height - sy, Math.max(10, Math.round(cropBox.h * src.height)));

      const offscreen = document.createElement("canvas");
      offscreen.width = sw;
      offscreen.height = sh;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);

      if (withAiRemoval) {
        setPhase("removing-bg");
        const cropBlob = await new Promise<Blob>((res, rej) => {
          offscreen.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png");
        });

        const { removeBackground } = await import("@imgly/background-removal");
        const resultBlob = await removeBackground(cropBlob, { publicPath: "/bg-removal/" });
        const bmp = await createImageBitmap(resultBlob);

        if (bitmap) pushHistory(bitmap);
        bitmapRef.current = bmp;
        setBitmap(bmp);
        setBgRemoved(true);
        setPhase("ready");
      } else {
        const bmp = await createImageBitmap(offscreen);
        if (bitmap) pushHistory(bitmap);
        bitmapRef.current = bmp;
        setBitmap(bmp);
        setBgRemoved(false);
        setPhase("ready");
      }

      setActiveTool("adjust");
    } catch (err) {
      console.warn("Crop failed", err);
      setBgError("Crop extraction encountered an error. Try cropping again or place as-is.");
      setPhase("bg-error");
    } finally {
      setCroppingBusy(false);
    }
  }

  // ── Color Eraser / Magic Wand Click Handler ────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== "color-erase") return;
    const canvas = previewRef.current;
    const bmp = bitmapRef.current;
    if (!canvas || !bmp) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Account for contain scale & offsets
    const SIZE = canvas.width;
    const srcW = bmp.width;
    const srcH = bmp.height;
    const scale = Math.min(SIZE / srcW, SIZE / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    const dx = (SIZE - dw) / 2;
    const dy = (SIZE - dh) / 2;

    let adjustedCanvasX = canvasX;
    if (flipped) {
      adjustedCanvasX = SIZE - canvasX;
    }

    const bmpX = Math.round((adjustedCanvasX - dx) / scale);
    const bmpY = Math.round((canvasY - dy) / scale);

    if (bmpX < 0 || bmpX >= srcW || bmpY < 0 || bmpY >= srcH) return;

    // Draw working bitmap on offscreen canvas to access raw pixel data
    const offscreen = document.createElement("canvas");
    offscreen.width = srcW;
    offscreen.height = srcH;
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);

    const imgData = ctx.getImageData(0, 0, srcW, srcH);
    const pIdx = (bmpY * srcW + bmpX) * 4;
    const tr = imgData.data[pIdx];
    const tg = imgData.data[pIdx + 1];
    const tb = imgData.data[pIdx + 2];
    const ta = imgData.data[pIdx + 3];

    if (ta === 0) {
      setColorEraseNotice("Clicked pixel is already transparent.");
      return;
    }

    if (eraseMode === "flood") {
      floodFillErase(imgData, bmpX, bmpY, tolerance);
    } else {
      globalColorErase(imgData, tr, tg, tb, tolerance);
    }

    ctx.putImageData(imgData, 0, 0);

    createImageBitmap(offscreen).then((newBmp) => {
      pushHistory(bmp);
      bitmapRef.current = newBmp;
      setBitmap(newBmp);
      setBgRemoved(true);
      setColorEraseNotice(`Color removed! Tap more areas or click Done.`);
    });
  }

  // ── Drag Box in Crop Mode ──────────────────────────────────────────
  const cropDragRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    initialBox: { x: number; y: number; w: number; h: number };
  } | null>(null);

  function startCropDrag(e: ReactPointerEvent<HTMLElement>, handle: string) {
    e.preventDefault();
    e.stopPropagation();
    cropDragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCropPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = cropDragRef.current;
    if (!d) return;

    const canvas = previewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const deltaX = (e.clientX - d.startX) / rect.width;
    const deltaY = (e.clientY - d.startY) / rect.height;

    const b = d.initialBox;
    let { x, y, w, h } = b;

    if (d.handle === "move") {
      x = Math.max(0, Math.min(1 - w, b.x + deltaX));
      y = Math.max(0, Math.min(1 - h, b.y + deltaY));
    } else if (d.handle === "se") {
      w = Math.max(0.1, Math.min(1 - b.x, b.w + deltaX));
      h = Math.max(0.1, Math.min(1 - b.y, b.h + deltaY));
    } else if (d.handle === "nw") {
      const newX = Math.max(0, Math.min(b.x + b.w - 0.1, b.x + deltaX));
      const newY = Math.max(0, Math.min(b.y + b.h - 0.1, b.y + deltaY));
      w = b.w + (b.x - newX);
      h = b.h + (b.y - newY);
      x = newX;
      y = newY;
    } else if (d.handle === "ne") {
      const newY = Math.max(0, Math.min(b.y + b.h - 0.1, b.y + deltaY));
      w = Math.max(0.1, Math.min(1 - b.x, b.w + deltaX));
      h = b.h + (b.y - newY);
      y = newY;
    } else if (d.handle === "sw") {
      const newX = Math.max(0, Math.min(b.x + b.w - 0.1, b.x + deltaX));
      w = b.w + (b.x - newX);
      h = Math.max(0.1, Math.min(1 - b.y, b.h + deltaY));
      x = newX;
    }

    setCropBox({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      w: Math.round(w * 100) / 100,
      h: Math.round(h * 100) / 100,
    });
  }

  function onCropPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (cropDragRef.current) {
      cropDragRef.current = null;
    }
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
  const isProcessing = phase === "loading" || phase === "removing-bg" || croppingBusy;
  const isReady = (phase === "ready" || phase === "bg-error") && !croppingBusy;

  const phaseLabel =
    phase === "loading" ? "Loading image…" :
    croppingBusy ? "Extracting logo from crop…" :
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
              Extract Logo or Design
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              {isProcessing
                ? "Processing your image…"
                : activeTool === "crop"
                  ? "Drag the box around the logo you want to extract."
                  : activeTool === "color-erase"
                    ? "Click on any background colour to make it transparent."
                    : bgRemoved
                      ? "Design extracted ✓ — fine-tune or place on your tee."
                      : "Adjust your design, then place it on the tee."}
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

          {/* ── Tool Tabs (AI / Crop First / Color Removal) ───────── */}
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-shell/50 p-1">
            <button
              type="button"
              onClick={() => setActiveTool("adjust")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition",
                activeTool === "adjust"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-smoke hover:text-ink",
              )}
            >
              <Sparkles size={13} className="text-rust" />
              Auto AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTool("crop")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition",
                activeTool === "crop"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-smoke hover:text-ink",
              )}
            >
              <Crop size={13} className="text-rust" />
              Crop Box
            </button>
            <button
              type="button"
              onClick={() => setActiveTool("color-erase")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition",
                activeTool === "color-erase"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-smoke hover:text-ink",
              )}
            >
              <Wand2 size={13} className="text-rust" />
              Remove Color
            </button>
          </div>

          {/* ── Live preview canvas + interactive overlays ──────── */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer ring */}
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
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
                  onClick={handleCanvasClick}
                  className={cn(
                    "block h-full w-full",
                    activeTool === "color-erase" ? "cursor-crosshair" : "cursor-default",
                  )}
                />

                {/* Crop Box Overlay */}
                {activeTool === "crop" && !isProcessing && (
                  <div
                    className="absolute inset-0 touch-none select-none"
                    onPointerMove={onCropPointerMove}
                    onPointerUp={onCropPointerUp}
                    onPointerCancel={onCropPointerUp}
                  >
                    {/* Bounding box */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${cropBox.x * 100}%`,
                        top: `${cropBox.y * 100}%`,
                        width: `${cropBox.w * 100}%`,
                        height: `${cropBox.h * 100}%`,
                        outline: "2px solid #C8542F",
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                        cursor: "move",
                      }}
                      onPointerDown={(e) => startCropDrag(e, "move")}
                    >
                      {/* Corner Handles */}
                      <span
                        className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 cursor-nw-resize rounded-full border-2 border-white bg-rust shadow-sm"
                        onPointerDown={(e) => startCropDrag(e, "nw")}
                      />
                      <span
                        className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 cursor-ne-resize rounded-full border-2 border-white bg-rust shadow-sm"
                        onPointerDown={(e) => startCropDrag(e, "ne")}
                      />
                      <span
                        className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-sw-resize rounded-full border-2 border-white bg-rust shadow-sm"
                        onPointerDown={(e) => startCropDrag(e, "sw")}
                      />
                      <span
                        className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-full border-2 border-white bg-rust shadow-sm"
                        onPointerDown={(e) => startCropDrag(e, "se")}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-paper/90 backdrop-blur-sm">
                  <div className="relative">
                    <Loader2 size={28} className="animate-spin text-rust" />
                  </div>
                  <span className="text-[12px] font-semibold text-ink">
                    {phaseLabel}
                  </span>
                  {phase === "removing-bg" && (
                    <span className="max-w-[160px] text-center text-[10px] leading-relaxed text-smoke">
                      AI model runs in your browser. First use downloads ~40 MB.
                    </span>
                  )}
                </div>
              )}

              {/* Bg-removed badge */}
              {bgRemoved && !isProcessing && activeTool === "adjust" && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-moss/15 px-2.5 py-0.5 text-[9.5px] font-semibold text-moss">
                  Design extracted ✓
                </span>
              )}
            </div>
          </div>

          {/* ── TOOL PANEL 1: CROP BOX CONTROLS ───────────────────── */}
          {activeTool === "crop" && !isProcessing && (
            <div className="rounded-2xl border border-rust/30 bg-rust/[0.03] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-ink">Crop Box Around Logo</p>
                  <p className="mt-0.5 text-[10.5px] text-smoke leading-relaxed">
                    Draw or drag the box directly over the logo. Background removal will run on that crop only.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleApplyCrop(true)}
                  className={buttonClass({ size: "sm" })}
                >
                  <Sparkles size={13} />
                  Extract Logo with AI
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCrop(false)}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <Crop size={13} />
                  Keep Box As-is
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("adjust")}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── TOOL PANEL 2: COLOR REMOVAL CONTROLS ──────────────── */}
          {activeTool === "color-erase" && !isProcessing && (
            <div className="rounded-2xl border border-line bg-shell/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-ink">Click Color to Remove</p>
                  <p className="mt-0.5 text-[10.5px] text-smoke leading-relaxed">
                    Tap any color in the preview above to erase it instantly.
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-smoke hover:text-ink"
                  >
                    <Undo2 size={12} />
                    Undo
                  </button>
                )}
              </div>

              {colorEraseNotice && (
                <p className="mt-2 text-[10.5px] font-medium text-rust animate-fade-in">
                  {colorEraseNotice}
                </p>
              )}

              {/* Erase Mode */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEraseMode("flood")}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border p-2 text-center transition",
                    eraseMode === "flood"
                      ? "border-ink bg-ink/5 ring-1 ring-ink"
                      : "border-line bg-paper text-smoke hover:border-ink/30",
                  )}
                >
                  <span className="text-[11px] font-semibold text-ink">Connected / Tap</span>
                  <span className="text-[9.5px] text-smoke">Erases surrounding background</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEraseMode("global")}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border p-2 text-center transition",
                    eraseMode === "global"
                      ? "border-ink bg-ink/5 ring-1 ring-ink"
                      : "border-line bg-paper text-smoke hover:border-ink/30",
                  )}
                >
                  <span className="text-[11px] font-semibold text-ink">All matching</span>
                  <span className="text-[9.5px] text-smoke">Erases this color everywhere</span>
                </button>
              </div>

              {/* Tolerance Slider */}
              <div className="mt-3">
                <span className="flex items-center justify-between text-[10.5px] font-medium text-smoke">
                  Color tolerance
                  <span className="font-semibold text-ink">{tolerance}%</span>
                </span>
                <input
                  type="range"
                  min={5}
                  max={70}
                  step={1}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="mt-1 w-full accent-ink"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTool("adjust")}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  Done editing
                </button>
              </div>
            </div>
          )}

          {/* ── TOOL PANEL 3: AUTO AI STATUS / ERROR ───────────────── */}
          {bgError && (
            <div className="rounded-2xl border border-rust/25 bg-rust/5 p-3.5">
              <p className="text-[11px] font-semibold text-rust">
                Extraction note
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
                  Try AI again
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("crop")}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <Crop size={13} />
                  Crop to logo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("color-erase")}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <Wand2 size={13} />
                  Erase color
                </button>
              </div>
            </div>
          )}

          {/* ── Restore original button ───────────────────────────── */}
          {bgRemoved && isReady && activeTool === "adjust" && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-shell/50 px-3.5 py-3">
              <div>
                <p className="text-[11px] font-semibold text-ink">
                  Design isolated
                </p>
                <p className="mt-0.5 text-[10px] text-smoke">
                  Need the original photo or want to re-crop?
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
          )}

          {/* ── Quick actions (flip / crop square) ────────────────── */}
          {isReady && activeTool === "adjust" && (
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
          )}

          {/* ── Background shape ──────────────────────────────────── */}
          {isReady && activeTool === "adjust" && (
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
          )}

          {/* ── Background colour ─────────────────────────────────── */}
          {isReady && activeTool === "adjust" && bgShape !== "transparent" && (
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
          )}

          {/* ── Adjustments panel ─────────────────────────────────── */}
          {isReady && activeTool === "adjust" && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => setAdjOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-shell/40"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold text-ink">
                  <Sliders size={14} className="text-smoke" />
                  Image adjustments
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

              {adjOpen && (
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
              )}
            </div>
          )}
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
