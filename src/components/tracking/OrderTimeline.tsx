import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/currency";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Lang, OrderEvent, OrderStatus } from "@/lib/types";

const FORWARD_STEPS: readonly OrderStatus[] = [
  "placed",
  "processing",
  "shipped",
  "delivered",
];

const CANCELLED_STEPS: readonly OrderStatus[] = ["placed", "cancelled"];

export function OrderTimeline({
  events,
  status,
  lang,
  t,
  className,
}: {
  events: OrderEvent[];
  status: OrderStatus;
  lang: Lang;
  t: Dictionary;
  className?: string;
}) {
  const steps = status === "cancelled" ? CANCELLED_STEPS : FORWARD_STEPS;
  const byStatus = new Map<OrderStatus, OrderEvent>();
  for (const event of events) {
    if (!byStatus.has(event.status)) byStatus.set(event.status, event);
  }
  const currentIndex = steps.indexOf(status);

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-line bg-paper p-5 sm:p-6",
        className,
      )}
    >
      <h2 className="font-display text-base font-bold tracking-[-0.02em]">
        {t.tracking.timelineTitle}
      </h2>

      {events.length === 0 ? (
        <p className="mt-2 text-[13px] text-smoke">{t.tracking.timelineEmpty}</p>
      ) : (
        <ol className="mt-4">
          {steps.map((step, index) => {
            const event = byStatus.get(step);
            const reached = Boolean(event) || index <= currentIndex;
            const cancelled = step === "cancelled";
            const isCurrent = step === status;

            return (
              <li
                key={step}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px",
                      reached && index < currentIndex
                        ? cancelled
                          ? "bg-rust/40"
                          : "bg-moss/40"
                        : "bg-line",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                    reached
                      ? cancelled
                        ? "border-rust bg-rust text-paper"
                        : "border-moss bg-moss text-paper"
                      : "border-line bg-paper text-smoke",
                  )}
                >
                  {reached ? (
                    cancelled ? (
                      <X size={13} strokeWidth={2.4} />
                    ) : (
                      <Check size={13} strokeWidth={2.4} />
                    )
                  ) : (
                    <Circle size={7} strokeWidth={0} fill="currentColor" />
                  )}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p
                      className={cn(
                        "text-[13px] font-semibold",
                        !reached && "text-smoke",
                      )}
                    >
                      {t.orders.status[step]}
                      {isCurrent ? (
                        <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#7A5A18]">
                          {t.tracking.latestUpdate}
                        </span>
                      ) : null}
                    </p>
                    {event ? (
                      <time
                        dateTime={new Date(event.createdAt).toISOString()}
                        className="text-[10.5px] text-smoke"
                      >
                        {formatDateTime(event.createdAt, lang)}
                      </time>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-[11.5px] leading-relaxed",
                      reached ? "text-smoke" : "text-smoke/60",
                    )}
                  >
                    {t.tracking.statusText[step]}
                  </p>
                  {event?.note ? (
                    <p className="mt-1.5 rounded-xl bg-shell px-2.5 py-1.5 text-[11px] leading-relaxed text-ink">
                      {event.note}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
