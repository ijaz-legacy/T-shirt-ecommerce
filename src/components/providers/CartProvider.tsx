"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MAX_PLACEMENTS,
  MAX_QTY,
  MAX_ROTATION,
  MAX_SCALE,
  MIN_ROTATION,
  MIN_SCALE,
  isFitId,
  isSize,
  isTeeColorId,
  parsePlacementRef,
} from "@/lib/catalog";
import type { CustomConfig, StickerPlacement } from "@/lib/types";
import type { FitId, Size, TeeColorId } from "@/lib/catalog";

export type CartLine =
  | { id: string; kind: "printed"; productSlug: string; size: Size; qty: number }
  | { id: string; kind: "custom"; config: CustomConfig; qty: number };

interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  addPrinted: (productSlug: string, size: Size, qty?: number) => void;
  addCustom: (config: CustomConfig, qty?: number) => void;
  updateQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "ijaz-legacy.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampQty(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.trunc(parsed)));
}

function isPlacement(value: unknown): value is StickerPlacement {
  if (!value || typeof value !== "object") return false;
  const placement = value as Record<string, unknown>;
  return (
    typeof placement.ref === "string" &&
    parsePlacementRef(placement.ref) !== null &&
    typeof placement.x === "number" &&
    placement.x >= 0 &&
    placement.x <= 100 &&
    typeof placement.y === "number" &&
    placement.y >= 0 &&
    placement.y <= 100 &&
    typeof placement.scale === "number" &&
    placement.scale >= MIN_SCALE &&
    placement.scale <= MAX_SCALE &&
    typeof placement.rotation === "number" &&
    placement.rotation >= MIN_ROTATION &&
    placement.rotation <= MAX_ROTATION
  );
}

function parseCustomConfig(value: unknown): CustomConfig | null {
  if (!value || typeof value !== "object") return null;
  const config = value as Record<string, unknown>;
  if (
    !isFitId(config.fit) ||
    !isSize(config.size) ||
    !isTeeColorId(config.colorId) ||
    !Array.isArray(config.placements) ||
    config.placements.length < 1 ||
    config.placements.length > MAX_PLACEMENTS ||
    !config.placements.every(isPlacement)
  ) {
    return null;
  }
  return {
    fit: config.fit as FitId,
    size: config.size as Size,
    colorId: config.colorId as TeeColorId,
    placements: config.placements,
  };
}

function parseLine(value: unknown): CartLine | null {
  if (!value || typeof value !== "object") return null;
  const line = value as Record<string, unknown>;
  const id = typeof line.id === "string" && line.id.length > 0 ? line.id : makeId();
  const qty = clampQty(line.qty);

  if (line.kind === "printed") {
    if (
      typeof line.productSlug !== "string" ||
      line.productSlug.length < 1 ||
      line.productSlug.length > 100 ||
      !isSize(line.size)
    ) {
      return null;
    }
    return { id, kind: "printed", productSlug: line.productSlug, size: line.size, qty };
  }

  if (line.kind === "custom") {
    const config = parseCustomConfig(line.config);
    if (!config) return null;
    return { id, kind: "custom", config, qty };
  }

  return null;
}

function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const lines: CartLine[] = [];
    for (const item of parsed.slice(0, 40)) {
      const line = parseLine(item);
      if (!line) continue;
      if (seen.has(line.id)) line.id = makeId();
      seen.add(line.id);
      lines.push(line);
    }
    return lines;
  } catch {
    return [];
  }
}

function configKey(config: CustomConfig): string {
  const placements = config.placements
    .map(
      (placement) =>
        `${placement.ref}@${placement.x},${placement.y},${placement.scale},${placement.rotation}`,
    )
    .join("|");
  return [config.fit, config.size, config.colorId, placements].join("|");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable in private browsing; the in-memory cart still works.
    }
  }, [lines, hydrated]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setLines(readCart());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addPrinted = useCallback(
    (productSlug: string, size: Size, qty = 1) => {
      const amount = clampQty(qty);
      setLines((current) => {
        const existing = current.find(
          (line) =>
            line.kind === "printed" &&
            line.productSlug === productSlug &&
            line.size === size,
        );
        if (existing) {
          return current.map((line) =>
            line.id === existing.id
              ? { ...line, qty: Math.min(MAX_QTY, line.qty + amount) }
              : line,
          );
        }
        if (current.length >= 40) return current;
        return [
          ...current,
          { id: makeId(), kind: "printed", productSlug, size, qty: amount },
        ];
      });
    },
    [],
  );

  const addCustom = useCallback((config: CustomConfig, qty = 1) => {
    const amount = clampQty(qty);
    setLines((current) => {
      const key = configKey(config);
      const existing = current.find(
        (line) => line.kind === "custom" && configKey(line.config) === key,
      );
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? { ...line, qty: Math.min(MAX_QTY, line.qty + amount) }
            : line,
        );
      }
      if (current.length >= 40) return current;
      return [...current, { id: makeId(), kind: "custom", config, qty: amount }];
    });
  }, []);

  const updateQty = useCallback((lineId: string, qty: number) => {
    const nextQty = clampQty(qty);
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, qty: nextQty } : line,
      ),
    );
  }, []);

  const remove = useCallback((lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(
    () => lines.reduce((total, line) => total + line.qty, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      count,
      addPrinted,
      addCustom,
      updateQty,
      remove,
      clear,
    }),
    [lines, hydrated, count, addPrinted, addCustom, updateQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return value;
}
