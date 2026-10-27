import type { Metadata } from "next";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { getDictionary } from "@/lib/lang";
import { getAllProducts } from "@/lib/products";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.nav.shop,
    description: t.shop.subtitle,
  };
}

export default async function ShopPage() {
  const { t } = await getDictionary();
  const products = await getAllProducts();

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">{t.shop.eyebrow}</p>
        <h1 className="display-title mt-2 text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">
          {t.shop.title}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-smoke sm:text-base">
          {t.shop.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mt-10">
        <ShopGrid products={products} />
      </div>
    </div>
  );
}
