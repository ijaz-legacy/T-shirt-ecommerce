"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_QTY } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useT } from "@/components/providers/LanguageProvider";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY,
  small = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
  className?: string;
}) {
  const t = useT();
  const buttonSize = small ? "h-8 w-8" : "h-10 w-10";
  const valueWidth = small ? "w-6" : "w-8";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-paper",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t.common.decrease}
        className={cn(
          "grid place-items-center rounded-full text-ink transition hover:bg-shell disabled:cursor-not-allowed disabled:opacity-30",
          buttonSize,
        )}
      >
        <Minus size={small ? 13 : 15} strokeWidth={2.2} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center text-[13px] font-semibold tabular-nums",
          valueWidth,
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t.common.increase}
        className={cn(
          "grid place-items-center rounded-full text-ink transition hover:bg-shell disabled:cursor-not-allowed disabled:opacity-30",
          buttonSize,
        )}
      >
        <Plus size={small ? 13 : 15} strokeWidth={2.2} />
      </button>
    </div>
  );
}
