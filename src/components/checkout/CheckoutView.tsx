"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TeePreview } from "@/components/tee/TeePreview";
import { FormField } from "@/components/ui/FormField";
import { buttonClass } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";
import {
  FREE_SHIPPING_THRESHOLD,
  calcCustomUnitPrice,
  calcShipping,
  getFit,
  getTeeColor,
} from "@/lib/catalog";
import type { FitId, Size, TeeColorId } from "@/lib/catalog";
import type { CustomConfig, StickerPlacement } from "@/lib/types";
import { fill, formatINR } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";
import type { Product, UserPublic } from "@/lib/types";

interface AddressFields {
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
}

type FieldErrors = Partial<Record<keyof AddressFields, string>>;

const FIELD_ORDER: (keyof AddressFields)[] = [
  "fullName",
  "phone",
  "address1",
  "city",
  "state",
  "pincode",
];

function makeIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `order-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

type OrderItemPayload =
  | {
      kind: "printed";
      productId: string;
      size: Size;
      quantity: number;
    }
  | {
      kind: "custom";
      fit: FitId;
      size: Size;
      colorId: TeeColorId;
      placements: StickerPlacement[];
      quantity: number;
    };

export function CheckoutView({
  user,
  products,
}: {
  user: UserPublic;
  products: Product[];
}) {
  const { lang, t } = useLanguage();
  const { lines, hydrated, clear } = useCart();
  const router = useRouter();

  const [address, setAddress] = useState<AddressFields>({
    fullName: user.name,
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  );

  const rows = useMemo(() => {
    return lines.map((line) => {
      if (line.kind === "printed") {
        const product = productMap.get(line.productSlug) ?? null;
        return {
          id: line.id,
          name: product
            ? lang === "ta"
              ? product.nameTa
              : product.nameEn
            : t.cart.unavailable,
          meta: product
            ? `${lang === "ta" ? product.colorTa : product.colorEn} · ${line.size}`
            : "",
          unitPrice: product?.price ?? 0,
          qty: line.qty,
          image: product?.image ?? null,
          config: null as CustomConfig | null,
          available: Boolean(product),
        };
      }
      const fit = getFit(line.config.fit);
      const color = getTeeColor(line.config.colorId);
      return {
        id: line.id,
        name: t.cart.customTee,
        meta: `${lang === "ta" ? fit.nameTa : fit.nameEn} · ${line.config.size} · ${
          lang === "ta" ? color.nameTa : color.nameEn
        }`,
        unitPrice: calcCustomUnitPrice(
          line.config.fit,
          line.config.placements.map((p) => p.scale),
        ),
        qty: line.qty,
        image: null,
        config: line.config as CustomConfig | null,
        available: true,
      };
    });
  }, [lines, productMap, lang, t.cart.customTee, t.cart.unavailable]);

  const availableRows = rows.filter((row) => row.available);
  const hasUnavailable = rows.some((row) => !row.available);
  const itemCount = availableRows.reduce((sum, row) => sum + row.qty, 0);
  const subtotal = availableRows.reduce(
    (sum, row) => sum + row.unitPrice * row.qty,
    0,
  );
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;
  const unitLabel = itemCount === 1 ? t.cart.unitItem : t.cart.unitItems;
  const fieldErrorCount = Object.values(fieldErrors).filter(Boolean).length;

  function updateField<K extends keyof AddressFields>(
    key: K,
    value: string,
  ) {
    setAddress((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const fullName = address.fullName.trim();

    if (!fullName) errors.fullName = t.errors.required;
    else if (fullName.length < 2) errors.fullName = t.errors.nameShort;

    if (!address.phone) errors.phone = t.errors.required;
    else if (!/^[6-9]\d{9}$/.test(address.phone)) {
      errors.phone = t.errors.phoneInvalid;
    }

    if (!address.address1.trim()) errors.address1 = t.errors.required;
    else if (address.address1.trim().length < 5) {
      errors.address1 = t.errors.addressShort;
    }

    if (!address.city.trim()) errors.city = t.errors.required;
    else if (address.city.trim().length < 2) errors.city = t.errors.addressShort;

    if (!address.state.trim()) errors.state = t.errors.required;
    else if (address.state.trim().length < 2) {
      errors.state = t.errors.addressShort;
    }

    if (!address.pincode) errors.pincode = t.errors.required;
    else if (!/^\d{6}$/.test(address.pincode)) {
      errors.pincode = t.errors.pincodeInvalid;
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      const first = FIELD_ORDER.find((field) => errors[field]);
      if (first) {
        document.getElementById(`checkout-${first}`)?.focus();
      }
      return;
    }

    const items: OrderItemPayload[] = [];
    for (const line of lines) {
      if (line.kind === "printed") {
        if (!productMap.has(line.productSlug)) continue;
        items.push({
          kind: "printed",
          productId: line.productSlug,
          size: line.size,
          quantity: line.qty,
        });
      } else {
        items.push({
          kind: "custom",
          fit: line.config.fit,
          size: line.config.size,
          colorId: line.config.colorId,
          placements: line.config.placements,
          quantity: line.qty,
        });
      }
    }

    if (items.length === 0) {
      setFormError(t.errors.EMPTY_CART);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    if (!idempotencyRef.current) {
      idempotencyRef.current = makeIdempotencyKey();
    }

    const result = await postJson<{
      order: { id: string; orderNumber: string; total: number };
    }>("/api/orders", {
      idempotencyKey: idempotencyRef.current,
      address: {
        fullName: address.fullName.trim(),
        phone: address.phone,
        address1: address.address1.trim(),
        address2: address.address2.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode,
      },
      items,
    });

    if (result.ok) {
      clear();
      router.push(`/orders/${result.data.order.id}?placed=1`);
      return;
    }

    if (result.code === "UNAUTHORIZED") {
      router.push("/login?next=%2Fcheckout");
      return;
    }

    setFormError(getErrorMessage(t, result.code));
    setSubmitting(false);
  }

  if (!hydrated) {
    return (
      <div className="container-page py-8 sm:py-12 lg:py-16">
        <div className="animate-pulse">
          <div className="h-3 w-24 rounded-full bg-line" />
          <div className="mt-4 h-10 w-48 rounded-2xl bg-line/80" />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-3">
              <div className="h-80 rounded-[2rem] border border-line bg-paper" />
              <div className="h-40 rounded-[2rem] border border-line bg-paper" />
            </div>
            <div className="h-96 rounded-[2rem] border border-line bg-paper" />
          </div>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-12 sm:py-20">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-paper text-smoke shadow-card">
            <Banknote size={26} strokeWidth={1.6} />
          </span>
          <h1 className="display-title mt-5 text-3xl sm:text-4xl">
            {t.checkout.emptyTitle}
          </h1>
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-smoke">
            {t.checkout.emptyText}
          </p>
          <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <Link href="/cart" className={buttonClass({ size: "lg" })}>
              <ArrowLeft size={16} />
              {t.checkout.backToCart}
            </Link>
            <Link
              href="/shop"
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              {t.cart.emptyCta}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t.checkout.eyebrow}</p>
          <h1 className="display-title mt-2 text-4xl leading-none sm:text-5xl">
            {t.checkout.title}
          </h1>
          <p className="mt-2 text-sm text-smoke">{t.checkout.subtitle}</p>
        </div>
        <Link
          href="/cart"
          className="hidden items-center gap-1.5 text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink sm:inline-flex"
        >
          <ArrowLeft size={13} />
          {t.checkout.backToCart}
        </Link>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold tracking-[-0.02em]">
                  {t.checkout.deliveryTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-smoke">
                  {t.checkout.deliveryNote}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-shell/50 px-4 py-3">
              <Mail size={16} className="mt-0.5 shrink-0 text-smoke" />
              <div className="min-w-0">
                <p className="text-[11px] text-smoke">{t.checkout.emailLabel}</p>
                <p className="truncate text-[13px] font-medium">{user.email}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-smoke">
                  {t.checkout.emailNote}
                </p>
              </div>
            </div>

            {fieldErrorCount > 0 ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rust/25 bg-rust/5 px-4 py-3 text-xs font-medium leading-relaxed text-rust"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {t.checkout.errorsTitle}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField
                id="checkout-fullName"
                label={t.checkout.fullName}
                error={fieldErrors.fullName}
              >
                <input
                  id="checkout-fullName"
                  name="fullName"
                  type="text"
                  value={address.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={
                    fieldErrors.fullName ? "checkout-fullName-error" : undefined
                  }
                  className={cn("field", fieldErrors.fullName && "field-error")}
                />
              </FormField>

              <FormField
                id="checkout-phone"
                label={t.checkout.phone}
                hint={t.checkout.phoneHint}
                error={fieldErrors.phone}
              >
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  value={address.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={10}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone
                      ? "checkout-phone-error"
                      : "checkout-phone-hint"
                  }
                  className={cn("field", fieldErrors.phone && "field-error")}
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField
                  id="checkout-address1"
                  label={t.checkout.address1}
                  error={fieldErrors.address1}
                >
                  <input
                    id="checkout-address1"
                    name="address1"
                    type="text"
                    value={address.address1}
                    onChange={(event) =>
                      updateField("address1", event.target.value)
                    }
                    autoComplete="address-line1"
                    aria-invalid={Boolean(fieldErrors.address1)}
                    aria-describedby={
                      fieldErrors.address1
                        ? "checkout-address1-error"
                        : undefined
                    }
                    className={cn(
                      "field",
                      fieldErrors.address1 && "field-error",
                    )}
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField
                  id="checkout-address2"
                  label={t.checkout.address2}
                  aside={t.checkout.optional}
                  error={fieldErrors.address2}
                >
                  <input
                    id="checkout-address2"
                    name="address2"
                    type="text"
                    value={address.address2}
                    onChange={(event) =>
                      updateField("address2", event.target.value)
                    }
                    autoComplete="address-line2"
                    className="field"
                  />
                </FormField>
              </div>

              <FormField
                id="checkout-city"
                label={t.checkout.city}
                error={fieldErrors.city}
              >
                <input
                  id="checkout-city"
                  name="city"
                  type="text"
                  value={address.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(fieldErrors.city)}
                  aria-describedby={
                    fieldErrors.city ? "checkout-city-error" : undefined
                  }
                  className={cn("field", fieldErrors.city && "field-error")}
                />
              </FormField>

              <FormField
                id="checkout-state"
                label={t.checkout.state}
                error={fieldErrors.state}
              >
                <input
                  id="checkout-state"
                  name="state"
                  type="text"
                  value={address.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  autoComplete="address-level1"
                  aria-invalid={Boolean(fieldErrors.state)}
                  aria-describedby={
                    fieldErrors.state ? "checkout-state-error" : undefined
                  }
                  className={cn("field", fieldErrors.state && "field-error")}
                />
              </FormField>

              <FormField
                id="checkout-pincode"
                label={t.checkout.pincode}
                error={fieldErrors.pincode}
              >
                <input
                  id="checkout-pincode"
                  name="pincode"
                  type="text"
                  value={address.pincode}
                  onChange={(event) =>
                    updateField(
                      "pincode",
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={6}
                  aria-invalid={Boolean(fieldErrors.pincode)}
                  aria-describedby={
                    fieldErrors.pincode ? "checkout-pincode-error" : undefined
                  }
                  className={cn(
                    "field",
                    fieldErrors.pincode && "field-error",
                  )}
                />
              </FormField>
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em]">
              {t.checkout.paymentTitle}
            </h2>
            <div className="mt-3 rounded-2xl border border-ink/25 bg-ink/[0.025] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink">
                  <Banknote size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {t.checkout.codTitle}
                    </p>
                    <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7A5A18]">
                      {t.checkout.codOnly}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-smoke">
                    {t.checkout.codText}
                  </p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-moss" />
              </div>
            </div>
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-smoke sm:hidden">
            {t.checkout.secureNote}
          </p>
        </form>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              {t.checkout.summaryTitle}
            </h2>
            <p className="mt-0.5 text-[11px] text-smoke">
              {fill(t.checkout.summaryCount, {
                count: itemCount,
                unit: unitLabel,
              })}
            </p>

            <div className="no-scrollbar mt-4 max-h-[250px] space-y-3 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-[#EDE4D5]">
                    {row.config ? (
                      <div className="flex h-full items-center justify-center p-1">
                        <TeePreview
                          colorId={row.config.colorId}
                          placements={row.config.placements}
                        />
                      </div>
                    ) : row.image ? (
                      <Image
                        src={row.image}
                        alt={row.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold leading-snug">
                      {row.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-smoke">
                      {row.available
                        ? fill(t.checkout.qtyShort, { qty: row.qty })
                        : t.cart.unavailable}
                    </p>
                    {row.meta && row.available ? (
                      <p className="truncate text-[10px] text-smoke/80">
                        {row.meta}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-[12px] font-semibold">
                    {formatINR(row.unitPrice * row.qty)}
                  </p>
                </div>
              ))}
            </div>

            {hasUnavailable ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-rust/25 bg-rust/5 px-3 py-2.5 text-[10.5px] font-medium leading-relaxed text-rust"
              >
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {t.errors.PRODUCT_UNAVAILABLE}
              </div>
            ) : null}

            <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.cart.subtotal}</span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.cart.shipping}</span>
                <span className="font-medium">
                  {shipping === 0
                    ? t.checkout.free
                    : formatINR(shipping)}
                </span>
              </div>
              {shipping > 0 ? (
                <p className="text-[10px] leading-relaxed text-smoke">
                  {fill(t.cart.freeShipPrefix, {
                    amount: formatINR(
                      Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
                    ),
                  })}
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-semibold">{t.cart.total}</span>
              <span className="font-display text-xl font-bold tracking-[-0.02em]">
                {formatINR(total)}
              </span>
            </div>

            {formError ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rust/25 bg-rust/5 px-4 py-3 text-xs font-medium leading-relaxed text-rust"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || subtotal <= 0 || hasUnavailable}
              className={buttonClass({ full: true, size: "lg", className: "mt-5" })}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.checkout.placing}
                </>
              ) : (
                <>
                  {fill(t.checkout.placeOrder, {
                    total: formatINR(total),
                  })}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="mt-3 text-[10px] leading-relaxed text-smoke">
              {fill(t.checkout.legal, { total: formatINR(total) })}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-smoke">
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-moss" />
              {t.checkout.secureNote}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
