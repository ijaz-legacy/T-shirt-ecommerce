"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search, SearchX, X } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { buttonClass } from "@/components/ui/button";
import { fill } from "@/lib/currency";
import { cn } from "@/lib/cn";
import type { Product, ProductCategory } from "@/lib/types";

const CATEGORY_KEYS: ProductCategory[] = [
  "nature",
  "retro",
  "abstract",
  "street",
];

type SortKey = "featured" | "price-asc" | "price-desc";

export function ShopGrid({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const list = products.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (!query) return true;
      const haystack = [
        product.nameEn,
        product.nameTa,
        product.colorEn,
        product.colorTa,
        product.descEn,
        product.descTa,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    if (sort === "price-asc") {
      return [...list].sort((a, b) => a.price - b.price || a.sortOrder - b.sortOrder);
    }
    if (sort === "price-desc") {
      return [...list].sort((a, b) => b.price - a.price || a.sortOrder - b.sortOrder);
    }
    return list;
  }, [products, category, deferredSearch, sort]);

  const filtersActive = search.trim().length > 0 || category !== "all";
  const resultLabel =
    filtered.length === 1
      ? t.shop.result
      : fill(t.shop.results, { count: filtered.length });

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setSort("featured");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">{t.shop.searchPlaceholder}</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-smoke"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.shop.searchPlaceholder}
            className="field rounded-full py-2.5 pl-10 pr-10 text-[13px] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t.common.close}
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
            >
              <X size={13} />
            </button>
          ) : null}
        </label>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-smoke sm:inline">{resultLabel}</span>
          <label className="relative block w-full sm:w-auto">
            <span className="sr-only">{t.shop.sort}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 w-full cursor-pointer appearance-none rounded-full border border-line bg-paper py-0 pl-4 pr-10 text-[13px] font-medium text-ink outline-none transition focus:border-ink/60 sm:w-auto"
            >
              <option value="featured">{t.shop.sortFeatured}</option>
              <option value="price-asc">{t.shop.sortPriceLow}</option>
              <option value="price-desc">{t.shop.sortPriceHigh}</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-smoke"
            />
          </label>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
          className={cn(
            "chip shrink-0 px-4 py-2 text-[12px]",
            category === "all"
              ? "border-ink bg-ink text-paper"
              : "hover:border-ink/40",
          )}
        >
          {t.categories.all}
        </button>
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            aria-pressed={category === key}
            className={cn(
              "chip shrink-0 px-4 py-2 text-[12px]",
              category === key
                ? "border-ink bg-ink text-paper"
                : "hover:border-ink/40",
            )}
          >
            {t.categories[key]}
          </button>
        ))}
        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto hidden shrink-0 items-center gap-1 text-[12px] font-medium text-smoke underline decoration-line underline-offset-4 transition hover:text-ink sm:inline-flex"
          >
            <X size={12} />
            {t.shop.clear}
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-smoke sm:hidden">{resultLabel}</p>

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-shell text-smoke">
            <SearchX size={20} />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold tracking-[-0.02em]">
            {t.shop.emptyTitle}
          </h2>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-smoke">
            {t.shop.emptyText}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className={buttonClass({ variant: "outline", size: "sm", className: "mt-5" })}
          >
            {t.shop.clear}
          </button>
        </div>
      )}

      <p className="mt-10 text-center text-[11px] text-smoke">
        {t.shop.madeToOrder} · {t.product.codTitle}
      </p>
    </div>
  );
}
