import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/cn";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getOrdersForAdmin, isOrderStatus, ORDER_STATUSES } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
}) {
  const query = await searchParams;
  const { lang, t } = await getDictionary();
  const requestedStatus = first(query.status);
  const status: OrderStatus | "all" = isOrderStatus(requestedStatus)
    ? requestedStatus
    : "all";
  const requestedPage = Number(first(query.page));
  const result = await getOrdersForAdmin(
    status,
    Number.isFinite(requestedPage) ? requestedPage : 1,
    15,
  );

  function filterHref(next: OrderStatus | "all"): string {
    return next === "all"
      ? "/admin/orders"
      : `/admin/orders?status=${next}`;
  }

  function pageHref(nextPage: number): string {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page", String(nextPage));
    return `/admin/orders?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-title text-2xl sm:text-3xl">
            {t.admin.orders.title}
          </h2>
          <p className="mt-1 text-[13px] text-smoke">
            {t.admin.orders.subtitle}
          </p>
        </div>
        <p className="text-[11px] text-smoke">
          {fill(t.admin.orders.count, { count: result.total })}
        </p>
      </div>

      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...ORDER_STATUSES] as const).map((option) => (
          <Link
            key={option}
            href={filterHref(option)}
            aria-current={status === option ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              status === option
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper text-smoke hover:border-ink/30 hover:text-ink",
            )}
          >
            {option === "all"
              ? t.admin.orders.filterAll
              : t.orders.status[option]}
          </Link>
        ))}
      </div>

      {result.orders.length === 0 ? (
        <div className="mt-5 rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
          <h3 className="font-display text-lg font-bold">
            {t.admin.orders.emptyTitle}
          </h3>
          <p className="mt-1.5 text-[13px] text-smoke">
            {t.admin.orders.emptyText}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {result.orders.map((order) => {
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="group block rounded-2xl border border-line bg-paper p-4 transition hover:border-ink/25 hover:shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-bold tracking-[-0.01em] group-hover:text-rust sm:text-[15px]">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-smoke">
                      {order.customerName} · {order.city}, {order.state}
                    </p>
                  </div>
                  <StatusPill
                    status={order.status}
                    label={t.orders.status[order.status]}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-[11px] text-smoke">
                  <span>
                    {t.admin.orders.placed} {formatDate(order.createdAt, lang)}
                    {" · "}
                    {fill(t.orders.itemsCount, {
                      count: itemCount,
                      unit:
                        itemCount === 1
                          ? t.orders.itemUnit
                          : t.orders.itemsUnit,
                    })}
                  </span>
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {formatINR(order.total)}
                    <ArrowRight
                      size={14}
                      className="text-smoke transition group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {result.pages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          {result.page > 1 ? (
            <Link
              href={pageHref(result.page - 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold transition hover:border-ink/30"
            >
              <ChevronLeft size={14} />
              {t.admin.orders.previous}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-[11px] text-smoke">
            {fill(t.admin.orders.page, {
              page: result.page,
              pages: result.pages,
            })}
          </p>
          {result.page < result.pages ? (
            <Link
              href={pageHref(result.page + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold transition hover:border-ink/30"
            >
              {t.admin.orders.next}
              <ChevronRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
