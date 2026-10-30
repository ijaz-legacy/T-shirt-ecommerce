import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Clock3,
  Package,
  PackageOpen,
  Shirt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  getAdminStats,
  getLowStockProducts,
} from "@/lib/admin";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { getOrdersForAdmin } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-smoke">
          {label}
        </p>
        <span
          className={
            tone === "warn"
              ? "grid h-8 w-8 place-items-center rounded-full bg-rust/10 text-rust"
              : "grid h-8 w-8 place-items-center rounded-full bg-shell text-ink"
          }
        >
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-[28px]">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-smoke">{hint}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  // Staff accounts manage orders only — the dashboard stays owner-only.
  await requireAdmin("/admin");
  const { lang, t } = await getDictionary();
  const [stats, recent, lowStock] = await Promise.all([
    getAdminStats(),
    getOrdersForAdmin("all", 1, 5),
    getLowStockProducts(),
  ]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t.admin.dashboard.openOrders}
          value={String(stats.openOrders)}
          hint={t.admin.dashboard.openOrdersHint}
          icon={PackageOpen}
        />
        <StatCard
          label={t.admin.dashboard.last24h}
          value={String(stats.ordersLast24h)}
          hint={t.admin.dashboard.last24hHint}
          icon={Clock3}
        />
        <StatCard
          label={t.admin.dashboard.revenue}
          value={formatINR(stats.deliveredRevenue)}
          hint={t.admin.dashboard.revenueHint}
          icon={Banknote}
        />
        <StatCard
          label={t.admin.dashboard.activeProducts}
          value={String(stats.activeProducts)}
          hint={fill(t.admin.dashboard.activeProductsHint, {
            low: stats.lowStockProducts,
            out: stats.outOfStockProducts,
          })}
          icon={Shirt}
          tone={stats.lowStockProducts > 0 ? "warn" : "default"}
        />
        <StatCard
          label={t.admin.dashboard.totalDesigns}
          value={String(stats.totalDesigns)}
          hint={t.admin.dashboard.totalDesignsHint}
          icon={Package}
        />
        <StatCard
          label={t.admin.dashboard.totalUsers}
          value={String(stats.totalUsers)}
          hint={t.admin.dashboard.totalUsersHint}
          icon={Users}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 sm:px-5">
        <p className="text-sm text-smoke">
          {t.admin.customersPage.subtitle}
        </p>
        <Link
          href="/admin/customers"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-paper transition hover:bg-ink/85"
        >
          {t.admin.customersPage.title}
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              {t.admin.dashboard.recentTitle}
            </h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
            >
              {t.admin.dashboard.recentCta}
              <ArrowRight size={13} />
            </Link>
          </div>

          {recent.orders.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-smoke">
              {t.admin.dashboard.recentEmpty}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="group flex flex-wrap items-center justify-between gap-3 py-3.5 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[13.5px] font-bold tracking-[-0.01em] group-hover:text-rust">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-smoke">
                        {order.customerName} · {t.admin.orders.placed}{" "}
                        {formatDate(order.createdAt, lang)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold">
                        {formatINR(order.total)}
                      </span>
                      <StatusPill
                        status={order.status}
                        label={t.orders.status[order.status]}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              {t.admin.dashboard.lowStockTitle}
            </h2>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
            >
              {t.admin.dashboard.lowStockCta}
              <ArrowRight size={13} />
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-smoke">
              {t.admin.dashboard.lowStockEmpty}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {lowStock.map((product) => {
                const name = lang === "ta" ? product.nameTa : product.nameEn;
                return (
                  <li key={product.slug}>
                    <Link
                      href={`/admin/products/${product.slug}`}
                      className="group flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold group-hover:text-rust">
                          {name}
                        </p>
                        <p className="truncate text-[10.5px] text-smoke">
                          {product.slug}
                        </p>
                      </div>
                      <span
                        className={
                          product.stock === 0
                            ? "shrink-0 rounded-full bg-rust/10 px-2.5 py-1 text-[10px] font-semibold text-rust"
                            : "shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold text-[#7A5A18]"
                        }
                      >
                        {product.stock === 0
                          ? t.admin.products.outOfStock
                          : fill(t.admin.dashboard.stockLeft, {
                              count: product.stock,
                            })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
