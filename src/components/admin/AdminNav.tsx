"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Shirt, Sticker, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/cn";

export function AdminNav({ role }: { role: "admin" | "staff" }) {
  const { t } = useLanguage();
  const pathname = usePathname();

  // Staff members manage orders only — the rest of the console stays owner-only.
  const links = [
    {
      href: "/admin",
      label: t.admin.nav.dashboard,
      icon: LayoutDashboard,
      active: pathname === "/admin",
      staff: false,
    },
    {
      href: "/admin/orders",
      label: t.admin.nav.orders,
      icon: Package,
      active: pathname.startsWith("/admin/orders"),
      staff: true,
    },
    {
      href: "/admin/products",
      label: t.admin.nav.products,
      icon: Shirt,
      active: pathname.startsWith("/admin/products"),
      staff: false,
    },
    {
      href: "/admin/stickers",
      label: t.admin.nav.stickers,
      icon: Sticker,
      active: pathname.startsWith("/admin/stickers"),
      staff: false,
    },
    {
      href: "/admin/customers",
      label: t.admin.nav.customers,
      icon: Users,
      active: pathname.startsWith("/admin/customers"),
      staff: false,
    },
  ].filter((link) => role === "admin" || link.staff);

  return (
    <nav
      aria-label={t.nav.admin}
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-line bg-paper p-1"
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition sm:px-4",
              link.active
                ? "bg-ink text-paper"
                : "text-smoke hover:bg-shell hover:text-ink",
            )}
          >
            <Icon size={15} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
