import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminProduct } from "@/lib/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getAdminProduct(slug);
  return { title: product ? product.nameEn : "Product" };
}

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getAdminProduct(slug);
  if (!product) notFound();
  return <ProductForm product={product} />;
}
