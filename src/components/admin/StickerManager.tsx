"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { buttonClass } from "@/components/ui/button";
import { fill } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import type { StickerRecord } from "@/lib/stickers";
import type { StickerCategory } from "@/lib/catalog";
import { cn } from "@/lib/cn";

type EditorState = { mode: "new" } | { mode: "edit"; sticker: StickerRecord } | null;

const UPLOAD_ACCEPT = "image/png,image/webp,image/svg+xml,image/jpeg";

const CATEGORY_META: Record<
  StickerCategory,
  { label: string; shortLabel: string; badgeCls: string; hint: string }
> = {
  small: {
    label: "Small — Logos & Badges",
    shortLabel: "Small (Logo)",
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300",
    hint: "Pocket & chest logos · Auto-scaled to compact pocket size",
  },
  medium: {
    label: "Medium — Half A4 Designs",
    shortLabel: "Medium (Half A4)",
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    hint: "Half A4 artwork & graphics · Centered or torso scale",
  },
  large: {
    label: "Large — Full A4 / Big",
    shortLabel: "Large (Full A4)",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    hint: "Full A4 sheet prints, anime characters & oversized front graphics",
  },
};

export function StickerManager({
  initialStickers,
}: {
  initialStickers: StickerRecord[];
}) {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const searchInputId = useId();
  const [stickers, setStickers] = useState<StickerRecord[]>(initialStickers);
  const [activeTab, setActiveTab] = useState<StickerCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [editor, setEditor] = useState<EditorState>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [category, setCategory] = useState<StickerCategory>("small");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deduplicate stickers by name as a protective guard
  const uniqueStickers = useMemo(() => {
    const seen = new Set<string>();
    return stickers.filter((s) => {
      const key = s.nameEn.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [stickers]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: uniqueStickers.length,
      small: uniqueStickers.filter((s) => s.category === "small").length,
      medium: uniqueStickers.filter((s) => s.category === "medium").length,
      large: uniqueStickers.filter((s) => s.category === "large").length,
    };
  }, [uniqueStickers]);

  // Filtered list
  const filteredStickers = useMemo(() => {
    return uniqueStickers.filter((s) => {
      if (activeTab !== "all" && s.category !== activeTab) return false;
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "inactive" && s.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEn = s.nameEn.toLowerCase().includes(q);
        const matchTa = s.nameTa.toLowerCase().includes(q);
        if (!matchEn && !matchTa) return false;
      }
      return true;
    });
  }, [uniqueStickers, activeTab, statusFilter, searchQuery]);

  function openNew() {
    setEditor({ mode: "new" });
    setNameEn("");
    setNameTa("");
    setActive(true);
    setSortOrder(stickers.length + 1);
    setCategory(activeTab === "all" ? "small" : activeTab);
    setFile(null);
    setFilePreview(null);
    setFormError(null);
  }

  function openEdit(sticker: StickerRecord) {
    setEditor({ mode: "edit", sticker });
    setNameEn(sticker.nameEn);
    setNameTa(sticker.nameTa);
    setActive(sticker.active);
    setSortOrder(sticker.sortOrder);
    setCategory(sticker.category);
    setFile(null);
    setFilePreview(null);
    setFormError(null);
  }

  function closeEditor() {
    setEditor(null);
    setFile(null);
    setFilePreview(null);
    setFormError(null);
  }

  function handleFileChange(selected: File | null) {
    setFile(selected);
    if (selected) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }

  async function handleSave() {
    if (!editor || busy) return;
    if (editor.mode === "new" && !file) {
      setFormError(t.admin.stickers.form.imageRequired);
      return;
    }
    if (nameEn.trim().length < 2 || nameTa.trim().length < 2) {
      setFormError(t.admin.stickers.form.validation);
      return;
    }
    setBusy(true);
    setFormError(null);

    const form = new FormData();
    form.append("nameEn", nameEn.trim());
    form.append("nameTa", nameTa.trim());
    form.append("active", active ? "true" : "false");
    form.append("sortOrder", String(Math.max(0, Math.round(sortOrder))));
    form.append("category", category);
    if (file) form.append("file", file);

    try {
      const isNew = editor.mode === "new";
      const url = isNew
        ? "/api/admin/stickers"
        : `/api/admin/stickers/${editor.sticker.id}`;
      const res = await fetch(url, { method: isNew ? "POST" : "PATCH", body: form });
      const data = (await res.json().catch(() => null)) as {
        sticker?: StickerRecord;
        error?: string;
      } | null;

      if (!res.ok || !data?.sticker) {
        setFormError(getErrorMessage(t, data?.error ?? "SERVER_ERROR"));
        setBusy(false);
        return;
      }

      const saved = data.sticker;
      setStickers((current) =>
        isNew
          ? [...current, saved]
          : current.map((s) => (s.id === saved.id ? saved : s)),
      );
      showToast({
        title: isNew
          ? t.admin.stickers.form.created
          : t.admin.stickers.form.saved,
        description: fill(
          isNew
            ? t.admin.stickers.form.createdDesc
            : t.admin.stickers.form.savedDesc,
          { name: lang === "ta" ? data.sticker.nameTa : data.sticker.nameEn },
        ),
      });
      setBusy(false);
      closeEditor();
    } catch {
      setFormError(getErrorMessage(t, "NETWORK_ERROR"));
      setBusy(false);
    }
  }

  async function handleToggleActive(sticker: StickerRecord) {
    const nextActive = !sticker.active;
    const form = new FormData();
    form.append("nameEn", sticker.nameEn);
    form.append("nameTa", sticker.nameTa);
    form.append("active", nextActive ? "true" : "false");
    form.append("sortOrder", String(sticker.sortOrder));
    form.append("category", sticker.category);

    // Optimistic update
    setStickers((current) =>
      current.map((s) => (s.id === sticker.id ? { ...s, active: nextActive } : s)),
    );

    try {
      const res = await fetch(`/api/admin/stickers/${sticker.id}`, {
        method: "PATCH",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        sticker?: StickerRecord;
      } | null;
      if (res.ok && data?.sticker) {
        const updated = data.sticker;
        setStickers((current) =>
          current.map((s) => (s.id === sticker.id ? updated : s)),
        );
      } else {
        // Rollback
        setStickers((current) =>
          current.map((s) => (s.id === sticker.id ? sticker : s)),
        );
      }
    } catch {
      // Rollback
      setStickers((current) =>
        current.map((s) => (s.id === sticker.id ? sticker : s)),
      );
    }
  }

  async function handleDelete(sticker: StickerRecord) {
    const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
    if (!window.confirm(fill(t.admin.stickers.deleteConfirm, { name }))) return;
    try {
      const res = await fetch(`/api/admin/stickers/${sticker.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStickers((current) => current.filter((s) => s.id !== sticker.id));
        showToast({ title: t.admin.stickers.deleted });
      } else {
        showToast({ title: "Failed to delete sticker", tone: "error" });
      }
    } catch {
      showToast({ title: "Network error while deleting", tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-title text-2xl sm:text-3xl">
            {t.admin.stickers.title}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-smoke">
            Manage all available stickers across Small (Logos & Badges), Medium (Half A4 Designs), and Large (Full A4 / Anime). Add new designs, edit categories, or remove stickers.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className={buttonClass({ size: "sm" })}
        >
          <Plus size={15} />
          {t.admin.stickers.new}
        </button>
      </div>

      {/* Category Tabs & Stats */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {[
          { id: "all", label: "All Stickers", count: counts.all },
          { id: "small", label: "Small (Logos & Icons)", count: counts.small },
          { id: "medium", label: "Medium (Half A4 Designs)", count: counts.medium },
          { id: "large", label: "Large (Full A4 Sheet)", count: counts.large },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as StickerCategory | "all")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                isActive
                  ? "border border-ink bg-ink text-paper shadow-xs"
                  : "border border-line bg-shell/80 text-smoke hover:border-ink/40 hover:text-ink",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isActive ? "bg-paper/20 text-paper" : "bg-ink/10 text-smoke",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-smoke"
          />
          <input
            id={searchInputId}
            name="sticker-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name in English or தமிழ்..."
            aria-label="Search stickers by name in English or Tamil"
            className="field w-full pl-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-smoke hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-smoke">Status:</span>
          <div className="inline-flex rounded-xl border border-line bg-paper p-0.5 text-xs">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                  statusFilter === s
                    ? "bg-ink text-paper"
                    : "text-smoke hover:text-ink",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-smoke">
            ({filteredStickers.length} shown)
          </span>
        </div>
      </div>

      {/* Sticker Grid */}
      {filteredStickers.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-line bg-paper p-10 text-center">
          <p className="font-display text-lg font-bold">
            {t.admin.stickers.emptyTitle}
          </p>
          <p className="mt-1 text-[13px] text-smoke">
            {searchQuery
              ? `No stickers matching "${searchQuery}"`
              : t.admin.stickers.emptyText}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className={buttonClass({ variant: "outline", size: "sm", className: "mt-4" })}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStickers.map((sticker) => {
            const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
            const meta = CATEGORY_META[sticker.category] ?? CATEGORY_META.small;

            return (
              <div
                key={sticker.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border bg-paper p-3 transition hover:shadow-xs",
                  sticker.active ? "border-line" : "border-dashed border-line/80 opacity-75",
                )}
              >
                <div>
                  {/* Image Container with subtle check-grid for SVGs/PNGs */}
                  <div className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-line/60 bg-shell/40 p-2">
                    <img
                      src={sticker.image}
                      alt={name}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      draggable={false}
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-paper/90 px-1.5 py-0.5 text-[9.5px] font-bold text-smoke shadow-xs backdrop-blur-xs">
                      #{sticker.sortOrder}
                    </span>
                    <span
                      className={cn(
                        "absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs",
                        meta.badgeCls,
                      )}
                    >
                      {sticker.category}
                    </span>
                  </div>

                  {/* Sticker Info */}
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-bold text-ink" title={name}>
                      {name}
                    </h3>
                    <p className="truncate text-[11px] text-smoke" title={lang === "ta" ? sticker.nameEn : sticker.nameTa}>
                      {lang === "ta" ? sticker.nameEn : sticker.nameTa}
                    </p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(sticker)}
                    aria-pressed={sticker.active}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] transition cursor-pointer",
                      sticker.active
                        ? "bg-moss/15 text-moss hover:bg-moss/25"
                        : "bg-shell text-smoke hover:bg-shell/80",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        sticker.active ? "bg-moss" : "bg-smoke",
                      )}
                    />
                    {sticker.active ? t.admin.stickers.active : t.admin.stickers.inactive}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(sticker)}
                      aria-label={`${t.admin.stickers.edit} — ${name}`}
                      title={t.admin.stickers.edit}
                      className="grid h-7 w-7 place-items-center rounded-lg text-smoke transition hover:bg-shell hover:text-ink cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sticker)}
                      aria-label={`${t.admin.stickers.delete} — ${name}`}
                      title={t.admin.stickers.delete}
                      className="grid h-7 w-7 place-items-center rounded-lg text-smoke transition hover:bg-rust/10 hover:text-rust cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (Add or Edit) */}
      {editor ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-xs"
          onClick={closeEditor}
        >
          <div
            className="my-auto w-full max-w-lg rounded-[2rem] border border-line bg-paper p-5 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="font-display text-lg font-bold tracking-[-0.02em]">
                  {editor.mode === "new"
                    ? t.admin.stickers.form.createTitle
                    : t.admin.stickers.form.editTitle}
                </h3>
                <p className="text-[11px] text-smoke">
                  {editor.mode === "new"
                    ? "Upload a new sticker and select its category tier"
                    : `Editing ${editor.sticker.nameEn}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label={t.admin.stickers.form.cancel}
                className="grid h-8 w-8 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-smoke">
                  Sticker Category Tier *
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as StickerCategory[]).map((cat) => {
                    const isSel = category === cat;
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer",
                          isSel
                            ? "border-ink bg-ink text-paper shadow-xs"
                            : "border-line bg-paper hover:border-ink/40 text-ink",
                        )}
                      >
                        <span className="text-[11px] font-bold capitalize">
                          {cat === "large" ? "Large (Full A4)" : cat === "medium" ? "Medium (Half A4)" : "Small (Logo)"}
                        </span>
                        <span className={cn("mt-0.5 text-[9px]", isSel ? "text-paper/80" : "text-smoke")}>
                          {cat === "large" ? "Full sheet" : cat === "medium" ? "Mid graphics" : "Icons / Badges"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-smoke">
                  {CATEGORY_META[category].hint}
                </p>
              </div>

              {/* Names */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-smoke">
                    {t.admin.stickers.form.nameEn} *
                  </span>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    maxLength={60}
                    placeholder="e.g. Phoenix Rising"
                    className="field mt-1 w-full text-xs"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-smoke">
                    {t.admin.stickers.form.nameTa} *
                  </span>
                  <input
                    type="text"
                    value={nameTa}
                    onChange={(e) => setNameTa(e.target.value)}
                    maxLength={90}
                    placeholder="e.g. பீனிக்ஸ் பறவை"
                    className="field mt-1 w-full text-xs"
                  />
                </label>
              </div>

              {/* Sort order & Active */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-semibold text-smoke">
                    {t.admin.stickers.form.sortOrder}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="field mt-1 w-full text-xs"
                  />
                </label>
                <label className="flex items-center gap-2.5 pt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-ink cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-ink">
                    Active (visible in studio)
                  </span>
                </label>
              </div>

              {/* Image Upload Area */}
              <div className="rounded-2xl border border-dashed border-line bg-shell/40 p-3.5">
                <span className="block text-[11px] font-semibold text-smoke">
                  {t.admin.stickers.form.image} *
                </span>
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper p-1.5 shadow-xs">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    ) : editor.mode === "edit" ? (
                      <img
                        src={editor.sticker.image}
                        alt="Current"
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <Upload size={22} className="text-smoke" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label className={buttonClass({ variant: "outline", size: "sm", className: "cursor-pointer" })}>
                      <Upload size={14} />
                      {file || editor.mode === "edit"
                        ? t.admin.stickers.form.replace
                        : t.admin.stickers.form.upload}
                      <input
                        type="file"
                        accept={UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <p className="mt-1.5 text-[10px] text-smoke leading-relaxed">
                      Accepts SVG, PNG (transparent recommended), WebP, JPG. Max 6 MB.
                    </p>
                    {file && (
                      <p className="mt-0.5 truncate text-[10px] font-medium text-moss">
                        Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {formError ? (
              <p role="alert" className="error-text mt-3">
                {formError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={closeEditor}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                {t.admin.stickers.form.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className={buttonClass({ size: "sm" })}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {busy
                  ? t.admin.stickers.form.saving
                  : editor.mode === "new"
                    ? t.admin.stickers.form.create
                    : t.admin.stickers.form.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
