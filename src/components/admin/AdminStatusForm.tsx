"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { buttonClass } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { fill } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import type { OrderStatus } from "@/lib/types";

export function AdminStatusForm({
  orderId,
  status,
  transitions,
}: {
  orderId: string;
  status: OrderStatus;
  transitions: OrderStatus[];
}) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<OrderStatus | null>(
    transitions[0] ?? null,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(transitions[0] ?? null);
    setNote("");
  }, [transitions]);

  if (transitions.length === 0) {
    return (
      <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-base font-bold tracking-[-0.02em]">
          {t.admin.order.manageTitle}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-smoke">
          {status === "delivered"
            ? t.admin.order.closedDelivered
            : status === "cancelled"
              ? t.admin.order.closedCancelled
              : t.admin.order.closed}
        </p>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;

    setSaving(true);
    const result = await postJson<{ order: { status: OrderStatus } }>(
      `/api/admin/orders/${orderId}/status`,
      { status: selected, note: note.trim() || undefined },
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

    showToast({
      title: t.admin.order.updated,
      description: fill(t.admin.order.updatedDesc, {
        status: t.orders.status[result.data.order.status],
      }),
    });
    setSaving(false);
    setSelected(null);
    setNote("");
    router.refresh();
  }

  return (
    <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
      <h2 className="font-display text-base font-bold tracking-[-0.02em]">
        {t.admin.order.manageTitle}
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed text-smoke">
        {t.admin.order.manageText}
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {transitions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              aria-pressed={selected === option}
              className={cn(
                "rounded-2xl border px-3.5 py-3 text-left text-[12.5px] font-semibold transition",
                selected === option
                  ? option === "cancelled"
                    ? "border-rust bg-rust/10 text-rust"
                    : "border-ink bg-ink text-paper"
                  : "border-line bg-paper text-ink hover:border-ink/40",
              )}
            >
              {t.admin.order.transitions[option]}
            </button>
          ))}
        </div>

        <label
          htmlFor="status-note"
          className="mt-4 block text-[12px] font-semibold"
        >
          {t.admin.order.noteLabel}
        </label>
        <textarea
          id="status-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          rows={2}
          placeholder={t.admin.order.notePlaceholder}
          className="field mt-1.5 resize-y text-[13px]"
        />

        {selected === "cancelled" ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-rust/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-rust">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t.admin.order.cancelWarning}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !selected}
          className={buttonClass({
            variant: selected === "cancelled" ? "rust" : "primary",
            full: true,
            className: "mt-4",
          })}
        >
          {saving ? t.admin.order.updating : t.admin.order.update}
        </button>
      </form>
    </section>
  );
}
