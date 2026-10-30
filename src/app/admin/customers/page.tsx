import type { Metadata } from "next";
import { Users } from "lucide-react";
import { TeePreview } from "@/components/tee/TeePreview";
import { getAdminStats } from "@/lib/admin";
import { fill, formatDate } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { requireAdmin } from "@/lib/session";
import { listAdminCustomerDesigns } from "@/lib/user-designs";

export const metadata: Metadata = { title: "Customers & designs" };

export default async function AdminCustomersPage() {
  await requireAdmin("/admin/customers");
  const [{ lang, t }, stats, customers] = await Promise.all([
    getDictionary(),
    getAdminStats(),
    listAdminCustomerDesigns(),
  ]);
  const designsTotal = customers.reduce(
    (total, customer) => total + customer.designs.length,
    0,
  );
  const copy = t.admin.customersPage;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-3xl border border-line bg-paper p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-smoke">
            {copy.subtitle}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[280px]">
          <div className="rounded-2xl bg-shell p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-smoke">{copy.customers}</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{stats.totalUsers}</p>
          </div>
          <div className="rounded-2xl bg-shell p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-smoke">{copy.savedDesigns}</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{stats.totalDesigns}</p>
          </div>
        </div>
      </header>

      {customers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper px-5 py-12 text-center">
          <Users size={24} className="mx-auto text-smoke" />
          <p className="mt-3 font-semibold">{copy.emptyTitle}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <section
              key={customer.id}
              className="overflow-hidden rounded-3xl border border-line bg-paper"
            >
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold">{customer.name}</h3>
                  <p className="mt-1 break-all text-xs text-smoke">{customer.email}</p>
                  <p className="mt-1 text-[11px] text-smoke">
                    {fill(copy.joined, { date: formatDate(customer.createdAt, lang) })}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center rounded-full bg-shell px-3 py-1.5 text-xs font-semibold">
                  {customer.designs.length === 1
                    ? copy.designCountOne
                    : fill(copy.designCount, { count: customer.designs.length })}
                </span>
              </div>

              {customer.designs.length === 0 ? (
                <p className="px-4 py-5 text-sm text-smoke sm:px-5">
                  {copy.noDesigns}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                  {customer.designs.map((design) =>
                    design.config ? (
                      <article
                        key={design.id}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-shell/50 p-3"
                      >
                        <div className="w-16 shrink-0 rounded-xl bg-paper p-1.5">
                          <TeePreview
                            colorId={design.config.colorId}
                            placements={design.config.placements}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {design.name || "Untitled design"}
                          </p>
                          <p className="mt-1 text-[11px] text-smoke">
                            {fill(copy.updated, { date: formatDate(design.updatedAt, lang) })}
                          </p>
                        </div>
                      </article>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="sr-only">
        Showing {customers.length} customers and {designsTotal} saved designs.
      </p>
    </div>
  );
}
