import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default function AdminNewProductPage() {
  return <ProductForm />;
}
