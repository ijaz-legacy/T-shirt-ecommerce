import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { TeePreview } from "@/components/tee/TeePreview";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonClass } from "@/components/ui/button";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.orders.title,
    description: t.orders.subtitle,
  };
}

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const { lang, t } = await getDictionary();
  const orders = await getOrdersForUser(user.id);

  return (
    <div className="container-page max-w-4xl py-8 sm:py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t.orders.eyebrow}</p>
          <h1 className="display-title mt-2 text-4xl leading-none sm:text-5xl">
            {t.orders.title}
          </h1>
          <p className="mt-2 text-sm text-smoke">{t.orders.subtitle}</p>
        </div>
        <Link
          href="/track"
          className={buttonClass({ variant: "light", size: "sm" })}
        >
          <Truck size={15} />
          {t.nav.track}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-shell text-smoke">
            <ShoppingBag size={22} strokeWidth={1.7} />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold tracking-[-0.02em]">
            {t.orders.emptyTitle}
          </h2>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-smoke">
            {t.orders.emptyText}
          </p>
          <Link
            href="/shop"
            className={buttonClass({ className: "mt-5" })}
          >
            {t.orders.emptyCta}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {orders.map((order) => {
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            const unit =
              itemCount === 1 ? t.orders.itemUnit : t.orders.itemsUnit;
            const date = formatDate(order.createdAt, lang);
            const previewItems = order.items.slice(0, 3);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group block rounded-[1.75rem] border border-line bg-paper p-4 transition hover:border-ink/25 hover:shadow-card sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-smoke">
                      {t.orders.orderLabel}
                    </p>
                    <p className="mt-0.5 font-display text-[15px] font-bold tracking-[-0.01em] sm:text-base">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-smoke">
                      {fill(t.orders.placedOn, { date })}
                    </p>
                  </div>
                  <StatusPill
                    status={order.status}
                    label={t.orders.status[order.status]}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {previewItems.map((item) => (
                        <span
                          key={item.id}
                          className="relative block h-11 w-9 overflow-hidden rounded-lg bg-[#EDE4D5]"
                        >
                          {item.kind === "custom" && item.custom ? (
                            <span className="flex h-full items-center justify-center p-0.5">
                              <TeePreview
                                colorId={item.custom.colorId}
                                placements={item.custom.placements}
                              />
                            </span>
                          ) : item.image ? (
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : null}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-smoke">
                      {fill(t.orders.itemsCount, {
                        count: itemCount,
                        unit,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9.5px] uppercase tracking-[0.08em] text-smoke">
                        {t.orders.cashDue}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatINR(order.total)}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink transition group-hover:bg-ink group-hover:text-paper">
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
