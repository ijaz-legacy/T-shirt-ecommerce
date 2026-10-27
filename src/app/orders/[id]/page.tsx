import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { TeePreview } from "@/components/tee/TeePreview";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { StatusPill } from "@/components/ui/StatusPill";
import { getSticker } from "@/lib/catalog";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getOrderEvents, getOrderForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.orders.detailTitle,
  };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string | string[] }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const { lang, t } = await getDictionary();
  const order = await getOrderForUser(id, user.id);
  const query = await searchParams;
  const placedParam = Array.isArray(query.placed)
    ? query.placed[0]
    : query.placed;
  const justPlaced = placedParam === "1";

  if (!order) {
    notFound();
  }

  const date = formatDate(order.createdAt, lang);
  const events = await getOrderEvents(order.id);
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const unit = itemCount === 1 ? t.orders.itemUnit : t.orders.itemsUnit;

  return (
    <div className="container-page max-w-5xl py-8 sm:py-12 lg:py-16">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink"
      >
        <ArrowLeft size={13} />
        {t.orders.backToOrders}
      </Link>

      {justPlaced ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-moss/25 bg-moss/10 p-4 sm:p-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-moss text-paper">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="font-display text-base font-bold tracking-[-0.01em]">
              {t.orders.confirmedBannerTitle}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-smoke">
              {t.orders.confirmedBannerText}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t.orders.detailTitle}</p>
          <h1 className="display-title mt-1.5 text-3xl leading-tight sm:text-4xl">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-[11px] text-smoke">
            {t.orders.orderDate} · {date}
          </p>
        </div>
        <StatusPill
          status={order.status}
          label={t.orders.status[order.status]}
        />
      </div>

      <div className="mt-7 grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
                {t.orders.itemsTitle}
              </h2>
              <span className="text-[11px] text-smoke">
                {fill(t.orders.itemsCount, { count: itemCount, unit })}
              </span>
            </div>

            <div className="mt-3 divide-y divide-line">
              {order.items.map((item) => {
                const name = lang === "ta" ? item.nameTa : item.nameEn;
                const color = lang === "ta" ? item.colorTa : item.colorEn;
                const stickerNames =
                  item.custom?.stickerIds.map((stickerId) => {
                    const sticker = getSticker(stickerId);
                    return lang === "ta" ? sticker.nameTa : sticker.nameEn;
                  }) ?? [];

                return (
                  <div key={item.id} className="flex gap-3 py-3.5">
                    <div className="relative h-[84px] w-16 shrink-0 overflow-hidden rounded-xl bg-[#EDE4D5] sm:h-24 sm:w-[76px]">
                      {item.kind === "custom" && item.custom ? (
                        <div className="flex h-full items-center justify-center p-1">
                          <TeePreview
                            colorId={item.custom.colorId}
                            stickerIds={item.custom.stickerIds}
                          />
                        </div>
                      ) : item.image ? (
                        <Image
                          src={item.image}
                          alt={name}
                          fill
                          sizes="76px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.productSlug ? (
                            <Link
                              href={`/product/${item.productSlug}`}
                              className="block truncate text-[13px] font-semibold leading-snug transition hover:text-rust sm:text-sm"
                            >
                              {name}
                            </Link>
                          ) : (
                            <p className="truncate text-[13px] font-semibold leading-snug sm:text-sm">
                              {name}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10.5px] text-smoke">
                            {color} · {item.size}
                          </p>
                          {stickerNames.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {stickerNames.map((stickerName) => (
                                <span
                                  key={stickerName}
                                  className="rounded-full bg-shell px-1.5 py-0.5 text-[9px] font-medium text-smoke"
                                >
                                  {stickerName}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold">
                          {formatINR(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <span className="text-[10.5px] text-smoke">
                          {fill(t.orders.qty, { qty: item.quantity })}
                        </span>
                        <span className="text-[10px] text-smoke">
                          {formatINR(item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <OrderTimeline
            events={events}
            status={order.status}
            lang={lang}
            t={t}
          />

          <div className="rounded-[2rem] bg-ink p-5 text-paper sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper/10 text-gold">
                <Truck size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">{t.orders.trackNote}</p>
                <p className="mt-1 text-xs leading-relaxed text-paper/55">
                  {t.orders.confirmedNote}
                </p>
              </div>
            </div>
            <p className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-4 text-[11px] text-paper/50">
              <span className="flex flex-wrap items-center gap-1.5">
                {t.orders.needHelp}
                <a
                  href={`mailto:${t.footer.email}`}
                  className="inline-flex items-center gap-1 font-semibold text-gold underline decoration-gold/30 underline-offset-4 transition hover:decoration-gold"
                >
                  <Mail size={12} />
                  {t.orders.contact}
                </a>
              </span>
              <Link
                href={`/track?order=${order.orderNumber}`}
                className="inline-flex items-center gap-1 font-semibold text-gold underline decoration-gold/30 underline-offset-4 transition hover:decoration-gold"
              >
                {t.orders.trackCta}
                <ArrowRight size={12} />
              </Link>
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-line bg-paper p-5">
            <h2 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.orders.deliverTo}
            </h2>
            <div className="mt-3 flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-rust" />
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold">{order.customerName}</p>
                <p className="mt-1 text-xs leading-relaxed text-smoke">
                  {order.address1}
                  <br />
                  {order.address2 ? (
                    <>
                      {order.address2}
                      <br />
                    </>
                  ) : null}
                  {order.city}, {order.state} {order.pincode}
                </p>
                <a
                  href={`tel:${order.phone}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-smoke transition hover:text-ink"
                >
                  <Phone size={12} />
                  {order.phone}
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-paper p-5">
            <h2 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.orders.paymentTitle}
            </h2>
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-shell/70 px-3.5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-ink">
                <Banknote size={15} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">
                  {t.orders.paymentCod}
                </p>
                <p className="text-[10px] text-smoke">
                  {t.checkout.codOnly}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-xs text-smoke">{t.orders.amountDue}</span>
              <span className="font-display text-lg font-bold tracking-[-0.02em]">
                {formatINR(order.total)}
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-paper p-5">
            <h2 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.checkout.summaryTitle}
            </h2>
            <div className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.orders.subtotal}</span>
                <span className="font-medium">{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-smoke">{t.orders.delivery}</span>
                <span className="font-medium">
                  {order.shippingFee === 0
                    ? t.common.free
                    : formatINR(order.shippingFee)}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm font-semibold">{t.orders.total}</span>
                <span className="font-display text-lg font-bold tracking-[-0.02em]">
                  {formatINR(order.total)}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
