import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, Mail, Search } from "lucide-react";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonClass } from "@/components/ui/button";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import {
  getOrderEvents,
  getOrderForUserByNumber,
  getOrdersForUser,
} from "@/lib/orders";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.tracking.title,
    description: t.tracking.subtitle,
    robots: { index: false, follow: false },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = first(query.order)?.trim() ?? "";
  const returnTo = raw
    ? `/track?order=${encodeURIComponent(raw)}`
    : "/track";
  const user = await requireUser(returnTo);
  const { lang, t } = await getDictionary();

  const normalized = raw.toUpperCase();
  const validNumber = /^VN-\d{6}-[A-F0-9]{6}$/.test(normalized);
  const order = validNumber
    ? await getOrderForUserByNumber(normalized, user.id)
    : null;
  const searched = raw.length > 0;
  const events = order ? await getOrderEvents(order.id) : [];
  const recent = (await getOrdersForUser(user.id)).slice(0, 4);
  const itemCount = order
    ? order.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const unit = itemCount === 1 ? t.orders.itemUnit : t.orders.itemsUnit;

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12 lg:py-16">
      <div>
        <p className="eyebrow">{t.tracking.eyebrow}</p>
        <h1 className="display-title mt-2 text-4xl leading-none sm:text-5xl">
          {t.tracking.title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-smoke">
          {t.tracking.subtitle}
        </p>
      </div>

      <form
        action="/track"
        method="get"
        className="mt-6 rounded-[1.75rem] border border-line bg-paper p-4 sm:p-5"
      >
        <label
          htmlFor="order-number"
          className="text-[13px] font-semibold"
        >
          {t.tracking.orderNumber}
        </label>
        <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="order-number"
            name="order"
            defaultValue={raw}
            required
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.tracking.placeholder}
            className="field flex-1 uppercase"
          />
          <button type="submit" className={buttonClass({ size: "lg" })}>
            <Search size={16} />
            {t.tracking.find}
          </button>
        </div>
      </form>

      {order ? (
        <div className="mt-5 space-y-4">
          <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-smoke">
                  {t.tracking.orderNumber}
                </p>
                <h2 className="mt-0.5 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  {order.orderNumber}
                </h2>
                <p className="mt-1 text-[11px] text-smoke">
                  {fill(t.tracking.placedOn, {
                    date: formatDate(order.createdAt, lang),
                  })}
                </p>
              </div>
              <StatusPill
                status={order.status}
                label={t.orders.status[order.status]}
              />
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl bg-shell/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-smoke">
                  {t.tracking.latestUpdate}
                </p>
                <p className="mt-1 text-[13.5px] font-semibold">
                  {t.orders.status[order.status]}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-smoke">
                  {t.tracking.statusText[order.status]}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-[0.08em] text-smoke">
                  {t.orders.cashDue}
                </p>
                <p className="text-sm font-semibold">{formatINR(order.total)}</p>
                <p className="text-[10px] text-smoke">
                  {fill(t.orders.itemsCount, { count: itemCount, unit })}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/orders/${order.id}`}
                className={buttonClass({ variant: "outline", size: "sm" })}
              >
                {t.orders.viewOrder}
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/track"
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                {t.orders.backToTrack}
              </Link>
            </div>
          </section>

          <OrderTimeline
            events={events}
            status={order.status}
            lang={lang}
            t={t}
          />
        </div>
      ) : searched ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-[1.75rem] border border-rust/25 bg-rust/5 p-4 sm:p-5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rust/10 text-rust">
            <AlertCircle size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold">{t.tracking.notFoundTitle}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-smoke">
              {t.tracking.notFoundText}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
            {t.tracking.recentTitle}
          </h2>
          <Link
            href="/orders"
            className="text-xs font-semibold text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            {t.tracking.viewAll}
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-3 rounded-[1.75rem] border border-dashed border-line bg-paper/60 px-5 py-8 text-center">
            <p className="text-[13px] text-smoke">{t.tracking.noRecent}</p>
            <Link
              href="/shop"
              className={buttonClass({ size: "sm", className: "mt-4" })}
            >
              {t.orders.emptyCta}
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            {recent.map((recentOrder) => (
              <Link
                key={recentOrder.id}
                href={`/track?order=${recentOrder.orderNumber}`}
                className="group flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-4 py-3 transition hover:border-ink/25"
              >
                <div className="min-w-0">
                  <p className="font-display text-[13px] font-bold group-hover:text-rust">
                    {recentOrder.orderNumber}
                  </p>
                  <p className="text-[10.5px] text-smoke">
                    {formatDate(recentOrder.createdAt, lang)} ·{" "}
                    {formatINR(recentOrder.total)}
                  </p>
                </div>
                <StatusPill
                  status={recentOrder.status}
                  label={t.orders.status[recentOrder.status]}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 flex flex-wrap items-center gap-1.5 text-[11px] text-smoke">
        {t.tracking.needHelp}
        <a
          href={`mailto:${t.footer.email}`}
          className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          <Mail size={12} />
          {t.tracking.contact}
        </a>
      </p>
    </div>
  );
}
