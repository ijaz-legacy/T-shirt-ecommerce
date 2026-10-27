import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { fill } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: {
    default: "Retailer console",
    template: "%s · Retailer · IJAZ LEGACY",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin("/admin");
  const { t } = await getDictionary();

  return (
    <div className="container-page max-w-6xl py-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{t.admin.eyebrow}</p>
          <h1 className="display-title mt-1.5 text-3xl leading-tight sm:text-4xl">
            {t.admin.title}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-smoke">
            {t.admin.subtitle}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-[11px] text-smoke">
            {fill(t.admin.signedInAs, { name: user.name })}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            {t.admin.viewStore}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <AdminNav />
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}
