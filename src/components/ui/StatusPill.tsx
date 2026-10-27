import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const STYLES: Record<OrderStatus, string> = {
  placed: "bg-gold/20 text-[#7A5A18] ring-gold/30",
  processing: "bg-[#DCE9F0] text-[#274A61] ring-[#274A61]/20",
  shipped: "bg-[#26374F]/10 text-[#26374F] ring-[#26374F]/20",
  delivered: "bg-moss/15 text-moss ring-moss/25",
  cancelled: "bg-rust/10 text-rust ring-rust/20",
};

export function StatusPill({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {label}
    </span>
  );
}
