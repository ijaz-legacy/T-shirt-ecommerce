import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { getDictionary } from "@/lib/lang";
import { getAllProducts } from "@/lib/products";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.checkout.title,
    description: t.checkout.subtitle,
  };
}

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const products = await getAllProducts();

  return <CheckoutView user={user} products={products} />;
}
