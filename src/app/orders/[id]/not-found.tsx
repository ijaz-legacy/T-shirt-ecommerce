import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getDictionary } from "@/lib/lang";

export default async function OrderNotFound() {
  const { t } = await getDictionary();

  return (
    <div className="container-page py-12 sm:py-20">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-paper text-smoke shadow-card">
          <PackageX size={22} strokeWidth={1.6} />
        </span>
        <h1 className="display-title mt-5 text-3xl sm:text-4xl">
          {t.orders.notFoundTitle}
        </h1>
        <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-smoke">
          {t.orders.notFoundText}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/orders" className={buttonClass()}>
            <ArrowLeft size={15} />
            {t.orders.backToOrders}
          </Link>
          <Link href="/shop" className={buttonClass({ variant: "outline" })}>
            {t.cart.continueShopping}
          </Link>
        </div>
      </div>
    </div>
  );
}
