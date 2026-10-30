import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  // Staff accounts manage orders only — products stay owner-only.
  await requireAdmin("/admin/products");
  return <ProductForm />;
}
