"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Shirt, Trash2 } from "lucide-react";
import { TeePreview } from "@/components/tee/TeePreview";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { fill, formatDate } from "@/lib/currency";
import { getFit } from "@/lib/catalog";
import type { UserDesign } from "@/lib/user-designs";

export function DesignGallery({ designs }: { designs: UserDesign[] }) {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState(designs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteDesign(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/user-designs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        setError(t.custom.designDeleteError);
        return;
      }
      setItems((current) => current.filter((design) => design.id !== id));
    } catch {
      setError(t.custom.designDeleteNetworkError);
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper px-5 py-12 text-center sm:px-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-shell text-ink">
          <Shirt size={23} />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold">
          {t.custom.yourDesignsEmpty}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-smoke">
          {t.custom.designEmptyText}
        </p>
        <Link
          href="/customize"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper"
        >
          {t.custom.createFirstDesign}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">
          {error}
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((design) => {
          if (!design.config) return null;
          const fit = getFit(design.config.fit);
          const fitLabel = lang === "ta" ? fit.nameTa : fit.nameEn;
          return (
            <article
              key={design.id}
              className="group overflow-hidden rounded-3xl border border-line bg-paper shadow-card transition hover:-translate-y-0.5 hover:border-ink/25"
            >
              <Link
                href={`/customize?design=${encodeURIComponent(design.id)}`}
                aria-label={`${t.custom.editDesign} ${design.name || "Untitled design"}`}
                className="block bg-shell/70 p-5"
              >
                <TeePreview
                  colorId={design.config.colorId}
                  placements={design.config.placements}
                  className="mx-auto w-full max-w-[190px]"
                />
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">
                      {design.name || "Untitled design"}
                    </h2>
                    <p className="mt-1 text-xs text-smoke">
                      {fitLabel}
                      {design.config.size ? ` · ${design.config.size}` : ""}
                      {" · "}
                      {fill(t.custom.designUpdated, {
                        date: formatDate(design.updatedAt, lang),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteDesign(design.id)}
                    disabled={deletingId !== null}
                    aria-label={`${t.custom.deleteDesign} ${design.name || "Untitled design"}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-smoke transition hover:border-rust/30 hover:bg-rust/10 hover:text-rust disabled:opacity-50"
                  >
                    {deletingId === design.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
                <Link
                  href={`/customize?design=${encodeURIComponent(design.id)}`}
                  className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-full border border-line text-xs font-semibold transition hover:border-ink hover:bg-ink hover:text-paper"
                >
                  {t.custom.editDesign}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
