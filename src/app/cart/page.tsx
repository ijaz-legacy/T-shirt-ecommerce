import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { getDictionary } from "@/lib/lang";
import { getAllProducts } from "@/lib/products";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.cart.title,
    description: t.cart.subtitleOne,
  };
}

export default async function CartPage() {
  const products = await getAllProducts();
  return <CartView products={products} />;
}
