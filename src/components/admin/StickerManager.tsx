"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { buttonClass } from "@/components/ui/button";
import { fill } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import type { StickerRecord } from "@/lib/stickers";
import type { StickerCategory } from "@/lib/catalog";
import { cn } from "@/lib/cn";

type EditorState = { mode: "new" } | { mode: "edit"; sticker: StickerRecord } | null;

const UPLOAD_ACCEPT = "image/png";

const CATEGORY_LABELS: Record<StickerCategory, { label: string; hint: string }> = {
  small: { label: "Small — Logo / Icon", hint: "Max 200×200 px · For small logos and icons" },
  medium: { label: "Medium — Name / Half-sheet", hint: "Max 400×400 px · Names, text or half-sheet images" },
  large: { label: "Large — Full sheet (A4)", hint: "Max 800×800 px · Full A4 size prints" },
};

export function StickerManager({
  initialStickers,
}: {
  initialStickers: StickerRecord[];
}) {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [stickers, setStickers] = useState<StickerRecord[]>(initialStickers);
  const [editor, setEditor] = useState<EditorState>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [category, setCategory] = useState<StickerCategory>("small");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openNew() {
    setEditor({ mode: "new" });
    setNameEn("");
    setNameTa("");
    setActive(true);
    setSortOrder(stickers.length);
    setCategory("small");
    setFile(null);
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
    setFormError(null);
  }

  function closeEditor() {
    setEditor(null);
    setFormError(null);
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
    const form = new FormData();
    form.append("nameEn", sticker.nameEn);
    form.append("nameTa", sticker.nameTa);
    form.append("active", sticker.active ? "false" : "true");
    form.append("sortOrder", String(sticker.sortOrder));
    form.append("category", sticker.category);
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
      }
    } catch {
      /* keep previous state on network failure */
    }
  }

  async function handleDelete(sticker: StickerRecord) {
    if (!window.confirm(t.admin.stickers.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/admin/stickers/${sticker.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStickers((current) => current.filter((s) => s.id !== sticker.id));
        showToast({ title: t.admin.stickers.deleted });
      }
    } catch {
      /* ignore network failure */
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-title text-2xl sm:text-3xl">
            {t.admin.stickers.title}
          </h2>
          <p className="mt-1 max-w-lg text-[13px] text-smoke">
            {t.admin.stickers.subtitle}
          </p>
        </div>
        <button type="button" onClick={openNew} className={buttonClass({ size: "sm" })}>
          <Plus size={15} />
          {t.admin.stickers.new}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-smoke">
        {fill(t.admin.stickers.count, { count: stickers.length })}
      </p>

      {stickers.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-line bg-paper p-10 text-center">
          <p className="font-display text-lg font-bold">
            {t.admin.stickers.emptyTitle}
          </p>
          <p className="mt-1 text-[13px] text-smoke">
            {t.admin.stickers.emptyText}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stickers.map((sticker) => {
            const name = lang === "ta" ? sticker.nameTa : sticker.nameEn;
            return (
              <div
                key={sticker.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3"
              >
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-shell p-1.5">
                  <img
                    src={sticker.image}
                    alt={name}
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{name}</p>
                  <p className="mt-0.5 text-[10.5px] text-smoke">
                    #{sticker.sortOrder}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(sticker)}
                      aria-pressed={sticker.active}
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] transition",
                        sticker.active
                          ? "bg-moss/15 text-moss"
                          : "bg-shell text-smoke",
                      )}
                    >
                      {sticker.active
                        ? t.admin.stickers.active
                        : t.admin.stickers.inactive}
                    </button>
                    <span className="inline-flex items-center rounded-full bg-shell px-2 py-0.5 text-[9.5px] font-medium text-smoke">
                      {sticker.category === "large"
                        ? "Full sheet"
                        : sticker.category === "medium"
                          ? "Medium"
                          : "Small"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(sticker)}
                    aria-label={`${t.admin.stickers.edit} — ${name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sticker)}
                    aria-label={`${t.admin.stickers.delete} — ${name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-smoke transition hover:bg-rust/10 hover:text-rust"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-line bg-paper p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold tracking-[-0.02em]">
                {editor.mode === "new"
                  ? t.admin.stickers.form.createTitle
                  : t.admin.stickers.form.editTitle}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                aria-label={t.admin.stickers.form.cancel}
                className="grid h-8 w-8 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-smoke">
                  {t.admin.stickers.form.nameEn}
                </span>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  maxLength={60}
                  className="field mt-1 w-full"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-smoke">
                  {t.admin.stickers.form.nameTa}
                </span>
                <input
                  type="text"
                  value={nameTa}
                  onChange={(e) => setNameTa(e.target.value)}
                  maxLength={90}
                  className="field mt-1 w-full"
                />
              </label>
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
                    className="field mt-1 w-full"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="text-[11px] font-semibold text-smoke">
                    {t.admin.stickers.form.active}
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold text-smoke">
                  Size category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StickerCategory)}
                  className="field mt-1 w-full"
                >
                  {(["small", "medium", "large"] as StickerCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-smoke">
                  {CATEGORY_LABELS[category].hint}
                </p>
              </label>

              <div className="rounded-2xl border border-dashed border-ink/25 bg-shell/40 p-3">
                <span className="text-[11px] font-semibold text-smoke">
                  {t.admin.stickers.form.image}
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper p-1.5">
                    {file ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    ) : editor.mode === "edit" ? (
                      <img
                        src={editor.sticker.image}
                        alt=""
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <Upload size={18} className="text-smoke" />
                    )}
                  </span>
                  <label className={buttonClass({ variant: "outline", size: "sm" })}>
                    <Upload size={14} />
                    {file || editor.mode === "edit"
                      ? t.admin.stickers.form.replace
                      : t.admin.stickers.form.upload}
                    <input
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-smoke">
                  PNG with transparent background recommended. Up to 6 MB. Size is automatically adjusted for the selected category.
                </p>
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
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
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
