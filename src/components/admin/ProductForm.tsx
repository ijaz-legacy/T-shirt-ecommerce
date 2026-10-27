"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, Upload } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { FormField } from "@/components/ui/FormField";
import { buttonClass } from "@/components/ui/button";
import { patchJson, postForm, postJson } from "@/lib/api-client";
import { fill } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import type {
  AdminProduct,
  BadgeKey,
  ProductCategory,
} from "@/lib/types";

const CATEGORIES: ProductCategory[] = [
  "nature",
  "retro",
  "abstract",
  "street",
];

const BADGES: BadgeKey[] = ["bestseller", "new", "limited"];
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

interface FormState {
  slug: string;
  nameEn: string;
  nameTa: string;
  descEn: string;
  descTa: string;
  price: string;
  stock: string;
  sortOrder: string;
  colorEn: string;
  colorTa: string;
  colorHex: string;
  category: ProductCategory;
  badge: BadgeKey | "";
  featured: boolean;
  active: boolean;
  image: string;
}

function initialState(product?: AdminProduct): FormState {
  if (product) {
    return {
      slug: product.slug,
      nameEn: product.nameEn,
      nameTa: product.nameTa,
      descEn: product.descEn,
      descTa: product.descTa,
      price: String(product.price),
      stock: String(product.stock),
      sortOrder: String(product.sortOrder),
      colorEn: product.colorEn,
      colorTa: product.colorTa,
      colorHex: product.colorHex,
      category: product.category,
      badge: product.badge ?? "",
      featured: product.featured,
      active: product.active,
      image: product.image,
    };
  }
  return {
    slug: "",
    nameEn: "",
    nameTa: "",
    descEn: "",
    descTa: "",
    price: "899",
    stock: "25",
    sortOrder: "0",
    colorEn: "",
    colorTa: "",
    colorHex: "#EDE4D5",
    category: "nature",
    badge: "",
    featured: false,
    active: true,
    image: "",
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ProductForm({ product }: { product?: AdminProduct }) {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const isEdit = Boolean(product);
  const [state, setState] = useState<FormState>(() => initialState(product));
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function handleNameEn(value: string) {
    setState((current) => ({
      ...current,
      nameEn: value,
      slug:
        !isEdit && !slugTouched ? slugify(value) : current.slug,
    }));
  }

  async function handleUpload(file: File | undefined) {
    if (!file || uploading) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(t.errors.FILE_TOO_LARGE);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setImageError(null);
    const body = new FormData();
    body.append("file", file);
    const result = await postForm<{ path: string }>(
      "/api/admin/uploads",
      body,
    );

    if (result.ok) {
      update("image", result.data.path);
    } else {
      setUploadError(getErrorMessage(t, result.code));
    }
    setUploading(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    if (!state.image) {
      setImageError(t.admin.productForm.imageRequired);
      return;
    }

    const payload = {
      ...(!isEdit ? { slug: state.slug } : {}),
      nameEn: state.nameEn.trim(),
      nameTa: state.nameTa.trim(),
      descEn: state.descEn.trim(),
      descTa: state.descTa.trim(),
      price: Number(state.price),
      image: state.image,
      colorEn: state.colorEn.trim(),
      colorTa: state.colorTa.trim(),
      colorHex: state.colorHex,
      category: state.category,
      badge: state.badge || null,
      featured: state.featured,
      active: state.active,
      stock: Number(state.stock),
      sortOrder: Number(state.sortOrder),
    };

    setSaving(true);
    const result = isEdit
      ? await patchJson<{ product: AdminProduct }>(
          `/api/admin/products/${product?.slug}`,
          payload,
        )
      : await postJson<{ product: AdminProduct }>(
          "/api/admin/products",
          payload,
        );

    if (!result.ok) {
      showToast({
        title: t.toasts.errorTitle,
        description: getErrorMessage(t, result.code),
        tone: "error",
      });
      setSaving(false);
      return;
    }

    const name = lang === "ta" ? state.nameTa : state.nameEn;
    showToast(
      isEdit
        ? { title: t.admin.productForm.saved, description: t.admin.productForm.savedDesc }
        : {
            title: t.admin.productForm.created,
            description: fill(t.admin.productForm.createdDesc, { name }),
          },
    );
    setSaving(false);
    router.push("/admin/products");
    router.refresh();
  }

  const busy = saving || uploading;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink"
      >
        <ArrowLeft size={13} />
        {t.admin.products.title}
      </Link>

      <div className="mt-4">
        <h2 className="display-title text-2xl sm:text-3xl">
          {isEdit
            ? t.admin.productForm.editTitle
            : t.admin.productForm.createTitle}
        </h2>
        <p className="mt-1 text-[13px] text-smoke">
          {isEdit
            ? t.admin.productForm.editSubtitle
            : t.admin.productForm.createSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <h3 className="font-display text-base font-bold tracking-[-0.02em]">
            {t.admin.productForm.media}
          </h3>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-2xl border border-line bg-[#EDE4D5]">
              {state.image ? (
                <Image
                  src={state.image}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                <span className="grid h-full place-items-center text-smoke">
                  <ImageIcon size={26} strokeWidth={1.5} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label
                className={buttonClass({
                  variant: "light",
                  size: "sm",
                  className: uploading ? "pointer-events-none opacity-60" : "cursor-pointer",
                })}
              >
                <Upload size={14} />
                {uploading
                  ? t.admin.productForm.uploading
                  : state.image
                    ? t.admin.productForm.replace
                    : t.admin.productForm.upload}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploading}
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              <p className="helper max-w-md">{t.admin.productForm.imageHint}</p>
              {uploadError ? (
                <p role="alert" className="error-text">
                  {uploadError}
                </p>
              ) : null}
              {imageError ? (
                <p role="alert" className="error-text">
                  {imageError}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <h3 className="font-display text-base font-bold tracking-[-0.02em]">
            {t.admin.productForm.basics}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              id="nameEn"
              label={t.admin.productForm.nameEn}
            >
              <input
                id="nameEn"
                value={state.nameEn}
                onChange={(event) => handleNameEn(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                className="field"
              />
            </FormField>

            <FormField
              id="nameTa"
              label={t.admin.productForm.nameTa}
            >
              <input
                id="nameTa"
                value={state.nameTa}
                onChange={(event) => update("nameTa", event.target.value)}
                required
                minLength={2}
                maxLength={120}
                className="field"
              />
            </FormField>

            <FormField
              id="slug"
              label={t.admin.productForm.slug}
              hint={t.admin.productForm.slugHint}
            >
              <input
                id="slug"
                value={state.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", slugify(event.target.value));
                }}
                required={!isEdit}
                readOnly={isEdit}
                disabled={isEdit}
                minLength={2}
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className="field"
              />
            </FormField>

            <FormField
              id="category"
              label={t.admin.productForm.category}
            >
              <select
                id="category"
                value={state.category}
                onChange={(event) =>
                  update("category", event.target.value as ProductCategory)
                }
                className="field"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t.categories[category]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="descEn"
              label={t.admin.productForm.descEn}
              className="sm:col-span-2"
            >
              <textarea
                id="descEn"
                value={state.descEn}
                onChange={(event) => update("descEn", event.target.value)}
                required
                minLength={10}
                maxLength={600}
                rows={3}
                className="field resize-y"
              />
            </FormField>

            <FormField
              id="descTa"
              label={t.admin.productForm.descTa}
              className="sm:col-span-2"
            >
              <textarea
                id="descTa"
                value={state.descTa}
                onChange={(event) => update("descTa", event.target.value)}
                required
                minLength={5}
                maxLength={900}
                rows={3}
                className="field resize-y"
              />
            </FormField>

            <FormField
              id="price"
              label={t.admin.productForm.price}
              hint={t.admin.productForm.priceHint}
            >
              <input
                id="price"
                type="number"
                inputMode="numeric"
                value={state.price}
                onChange={(event) => update("price", event.target.value)}
                required
                min={99}
                max={99999}
                step={1}
                className="field"
              />
            </FormField>

            <FormField
              id="badge"
              label={t.admin.productForm.badge}
            >
              <select
                id="badge"
                value={state.badge}
                onChange={(event) =>
                  update("badge", event.target.value as BadgeKey | "")
                }
                className="field"
              >
                <option value="">{t.admin.productForm.badgeNone}</option>
                {BADGES.map((badge) => (
                  <option key={badge} value={badge}>
                    {t.badges[badge]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <h3 className="font-display text-base font-bold tracking-[-0.02em]">
            {t.admin.productForm.details}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              id="colorEn"
              label={t.admin.productForm.colorEn}
            >
              <input
                id="colorEn"
                value={state.colorEn}
                onChange={(event) => update("colorEn", event.target.value)}
                required
                minLength={2}
                maxLength={40}
                className="field"
              />
            </FormField>

            <FormField
              id="colorTa"
              label={t.admin.productForm.colorTa}
            >
              <input
                id="colorTa"
                value={state.colorTa}
                onChange={(event) => update("colorTa", event.target.value)}
                required
                minLength={2}
                maxLength={60}
                className="field"
              />
            </FormField>

            <FormField
              id="colorHex"
              label={t.admin.productForm.colorHex}
            >
              <div className="flex items-center gap-2.5">
                <input
                  id="colorHex"
                  type="color"
                  value={state.colorHex}
                  onChange={(event) => update("colorHex", event.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-paper p-1"
                />
                <span className="text-[13px] font-medium tabular-nums text-smoke">
                  {state.colorHex.toUpperCase()}
                </span>
              </div>
            </FormField>
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <h3 className="font-display text-base font-bold tracking-[-0.02em]">
            {t.admin.productForm.inventory}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              id="stock"
              label={t.admin.productForm.stock}
              hint={t.admin.productForm.stockHint}
            >
              <input
                id="stock"
                type="number"
                inputMode="numeric"
                value={state.stock}
                onChange={(event) => update("stock", event.target.value)}
                required
                min={0}
                max={9999}
                step={1}
                className="field"
              />
            </FormField>

            <FormField
              id="sortOrder"
              label={t.admin.productForm.sortOrder}
              hint={t.admin.productForm.sortOrderHint}
            >
              <input
                id="sortOrder"
                type="number"
                inputMode="numeric"
                value={state.sortOrder}
                onChange={(event) => update("sortOrder", event.target.value)}
                required
                min={0}
                max={9999}
                step={1}
                className="field"
              />
            </FormField>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-shell/40 px-3.5 py-3">
              <input
                type="checkbox"
                checked={state.active}
                onChange={(event) => update("active", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rust"
              />
              <span className="text-[13px] font-semibold leading-snug">
                {t.admin.productForm.active}
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-shell/40 px-3.5 py-3">
              <input
                type="checkbox"
                checked={state.featured}
                onChange={(event) => update("featured", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rust"
              />
              <span className="text-[13px] font-semibold leading-snug">
                {t.admin.productForm.featured}
              </span>
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={busy}
            className={buttonClass({ size: "lg", className: "sm:min-w-48" })}
          >
            {saving
              ? t.admin.productForm.saving
              : isEdit
                ? t.admin.productForm.save
                : t.admin.productForm.create}
          </button>
          <Link
            href="/admin/products"
            className={buttonClass({ variant: "outline", size: "lg" })}
          >
            {t.admin.productForm.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
