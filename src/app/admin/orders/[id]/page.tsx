import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, MapPin, Phone } from "lucide-react";
import { AdminStatusForm } from "@/components/admin/AdminStatusForm";
import { TeePreview } from "@/components/tee/TeePreview";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { StatusPill } from "@/components/ui/StatusPill";
import { fill, formatDateTime, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import {
  ALLOWED_TRANSITIONS,
  getOrderEvents,
  getOrderForAdmin,
} from "@/lib/orders";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  return { title: order ? order.orderNumber : "Order" };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { lang, t } = await getDictionary();
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const events = await getOrderEvents(order.id);
  const transitions = [...ALLOWED_TRANSITIONS[order.status]];
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const unit = itemCount === 1 ? t.orders.itemUnit : t.orders.itemsUnit;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink"
      >
        <ArrowLeft size={13} />
        {t.admin.order.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t.admin.orders.title}</p>
          <h2 className="display-title mt-1 text-2xl leading-tight sm:text-3xl">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-[11px] text-smoke">
            {formatDateTime(order.createdAt, lang)} ·{" "}
            {fill(t.orders.itemsCount, { count: itemCount, unit })}
          </p>
        </div>
        <StatusPill
          status={order.status}
          label={t.orders.status[order.status]}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
            <h3 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.admin.order.itemsTitle}
            </h3>
            <div className="mt-2 divide-y divide-line">
              {order.items.map((item) => {
                const name = lang === "ta" ? item.nameTa : item.nameEn;
                const color = lang === "ta" ? item.colorTa : item.colorEn;
                return (
                  <div key={item.id} className="flex gap-3 py-3">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EDE4D5]">
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
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">
                          {name}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-smoke">
                          {color} · {item.size} ·{" "}
                          {fill(t.orders.qty, { qty: item.quantity })}
                        </p>
                        <p className="mt-1 text-[10px] text-smoke">
                          {formatINR(item.unitPrice)} {t.common.each}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-semibold">
                        {formatINR(item.unitPrice * item.quantity)}
                      </p>
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
        </div>

        <aside className="space-y-4">
          <AdminStatusForm
            orderId={order.id}
            status={order.status}
            transitions={transitions}
          />

          <section className="rounded-[2rem] border border-line bg-paper p-5">
            <h3 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.admin.order.customerTitle}
            </h3>
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
            <h3 className="font-display text-base font-bold tracking-[-0.02em]">
              {t.orders.paymentTitle}
            </h3>
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-shell/70 px-3.5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-ink">
                <Banknote size={15} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">
                  {t.admin.order.paymentCod}
                </p>
                <p className="text-[10px] text-smoke">{t.checkout.codOnly}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-[13px]">
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
              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
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
