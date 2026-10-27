"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ruler, X } from "lucide-react";
import { useT } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/cn";

const REGULAR = [
  { size: "S", chest: 38, length: 27 },
  { size: "M", chest: 40, length: 28 },
  { size: "L", chest: 42, length: 29 },
  { size: "XL", chest: 44, length: 30 },
  { size: "XXL", chest: 46, length: 31 },
];

const OVERSIZED = [
  { size: "S", chest: 42, length: 28 },
  { size: "M", chest: 44, length: 29 },
  { size: "L", chest: 46, length: 30 },
  { size: "XL", chest: 48, length: 31 },
  { size: "XXL", chest: 50, length: 32 },
];

export function SizeGuideDialog({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink",
          className,
        )}
      >
        <Ruler size={14} strokeWidth={1.9} />
        {label ?? t.sizeGuide.button}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="size-guide-title"
                className="max-h-[92vh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-soft sm:rounded-3xl sm:p-7"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="size-guide-title"
                      className="font-display text-2xl font-bold tracking-[-0.03em]"
                    >
                      {t.sizeGuide.title}
                    </h2>
                    <p className="mt-1 text-[13px] text-smoke">
                      {t.sizeGuide.subtitle}
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t.sizeGuide.close}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink transition hover:bg-shell"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6">
                  <SizeTable
                    title={t.sizeGuide.regular}
                    rows={REGULAR}
                    chestLabel={t.sizeGuide.chest}
                    lengthLabel={t.sizeGuide.length}
                    sizeLabel={t.sizeGuide.size}
                  />
                  <SizeTable
                    title={t.sizeGuide.oversized}
                    rows={OVERSIZED}
                    chestLabel={t.sizeGuide.chest}
                    lengthLabel={t.sizeGuide.length}
                    sizeLabel={t.sizeGuide.size}
                  />
                </div>

                <p className="mt-5 rounded-2xl bg-shell px-4 py-3 text-xs leading-relaxed text-smoke">
                  {t.sizeGuide.note}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SizeTable({
  title,
  rows,
  sizeLabel,
  chestLabel,
  lengthLabel,
}: {
  title: string;
  rows: { size: string; chest: number; length: number }[];
  sizeLabel: string;
  chestLabel: string;
  lengthLabel: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-shell text-[11px] uppercase tracking-[0.08em] text-smoke">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{sizeLabel}</th>
              <th className="px-4 py-2.5 font-semibold">{chestLabel}</th>
              <th className="px-4 py-2.5 font-semibold">{lengthLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => (
              <tr key={row.size} className="bg-paper">
                <td className="px-4 py-2.5 font-semibold">{row.size}</td>
                <td className="px-4 py-2.5 text-smoke">{row.chest}&quot;</td>
                <td className="px-4 py-2.5 text-smoke">{row.length}&quot;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
