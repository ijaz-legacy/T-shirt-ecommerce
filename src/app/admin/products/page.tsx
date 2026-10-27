import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { listAdminProducts } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { fill, formatDate, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const { lang, t } = await getDictionary();
  const products = await listAdminProducts();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-title text-2xl sm:text-3xl">
            {t.admin.products.title}
          </h2>
          <p className="mt-1 max-w-lg text-[13px] text-smoke">
            {t.admin.products.subtitle}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className={buttonClass({ size: "sm" })}
        >
          <Plus size={15} />
          {t.admin.products.new}
        </Link>
      </div>

      <p className="mt-3 text-[11px] text-smoke">
        {fill(t.admin.products.count, { count: products.length })}
      </p>

      {products.length === 0 ? (
        <div className="mt-5 rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
          <h3 className="font-display text-lg font-bold">
            {t.admin.products.emptyTitle}
          </h3>
          <p className="mt-1.5 text-[13px] text-smoke">
            {t.admin.products.emptyText}
          </p>
          <Link
            href="/admin/products/new"
            className={buttonClass({ className: "mt-5" })}
          >
            <Plus size={15} />
            {t.admin.products.new}
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {products.map((product) => {
            const name = lang === "ta" ? product.nameTa : product.nameEn;
            const low = product.stock > 0 && product.stock <= 5;
            return (
              <Link
                key={product.slug}
                href={`/admin/products/${product.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 transition hover:border-ink/25 hover:shadow-card sm:gap-4 sm:p-4"
              >
                <div className="relative h-[88px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-[#EDE4D5] sm:h-24 sm:w-20">
                  <Image
                    src={product.image}
                    alt={name}
                    fill
                    sizes="80px"
                    className={cn(
                      "object-cover",
                      !product.active && "opacity-50 grayscale",
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold group-hover:text-rust sm:text-sm">
                        {name}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-smoke">
                        {product.slug} · {t.categories[product.category]}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold">
                      {formatINR(product.price)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        product.active
                          ? "bg-moss/15 text-moss"
                          : "bg-shell text-smoke",
                      )}
                    >
                      {product.active
                        ? t.admin.products.active
                        : t.admin.products.inactive}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        product.stock === 0
                          ? "bg-rust/10 text-rust"
                          : low
                            ? "bg-gold/20 text-[#7A5A18]"
                            : "bg-shell text-smoke",
                      )}
                    >
                      {product.stock === 0
                        ? t.admin.products.outOfStock
                        : `${t.admin.products.stock}: ${product.stock}`}
                    </span>
                    {product.featured ? (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-paper">
                        {t.admin.productForm.featured}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-[10px] text-smoke">
                    {fill(t.admin.products.updated, {
                      date: formatDate(product.updatedAt, lang),
                    })}
                  </p>
                </div>

                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink transition group-hover:bg-ink group-hover:text-paper">
                  <Pencil size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
