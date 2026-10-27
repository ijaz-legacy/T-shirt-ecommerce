"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/catalog";
import { fill, formatINR } from "@/lib/currency";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";
import type { UserPublic } from "@/lib/types";

export function Header({ user }: { user: UserPublic | null }) {
  const { t } = useLanguage();
  const { hydrated, count } = useCart();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const firstName = user
    ? user.name.trim().split(/\s+/)[0] || user.email.split("@")[0]
    : "";
  const initial = firstName.charAt(0).toUpperCase() || "V";

  const deliveryLine = fill(t.announce.delivery, {
    threshold: formatINR(FREE_SHIPPING_THRESHOLD),
  });
  const cartLabel = fill(t.a11y.cartCount, { count });

  const navLinks = [
    {
      href: "/shop",
      label: t.nav.shop,
      icon: Shirt,
      active: pathname === "/shop" || pathname.startsWith("/product/"),
    },
    {
      href: "/customize",
      label: t.nav.customize,
      icon: Sparkles,
      active: pathname.startsWith("/customize"),
    },
  ];

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const result = await postJson<{ ok: boolean }>("/api/auth/logout", {});
    if (result.ok) {
      setAccountOpen(false);
      setMobileOpen(false);
      window.location.assign("/");
    } else {
      showToast({
        title: t.toasts.errorTitle,
        description: getErrorMessage(t, result.code),
        tone: "error",
      });
    }
    setSigningOut(false);
  }

  function closeMenus() {
    setMobileOpen(false);
    setAccountOpen(false);
  }

  return (
    <>
      <div className="bg-ink text-paper">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-2 text-[10.5px] font-medium tracking-wide sm:text-[11px]">
            <Truck size={13} className="shrink-0 text-gold" />
            <span className="truncate">{deliveryLine}</span>
          </p>
          <p className="hidden shrink-0 items-center gap-2 text-[11px] font-medium tracking-wide text-paper/75 sm:flex">
            <Banknote size={13} className="text-gold" />
            {t.announce.cod}
          </p>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line/80 bg-shell/90 backdrop-blur-md supports-[backdrop-filter]:bg-shell/80">
        <div className="container-page flex h-16 items-center justify-between gap-3 lg:h-[72px]">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label={t.common.menu}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    link.active
                      ? "bg-ink text-paper"
                      : "text-ink/75 hover:bg-ink/[0.05] hover:text-ink",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            {user ? (
              <div ref={accountRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label={t.a11y.openAccount}
                  className="flex h-10 items-center gap-2 rounded-full border border-line bg-paper pl-1 pr-2.5 transition hover:border-ink/30 hover:bg-shell"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-rust text-[12px] font-bold text-paper">
                    {initial}
                  </span>
                  <span className="max-w-[100px] truncate text-xs font-semibold">
                    {firstName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-smoke transition",
                      accountOpen && "rotate-180",
                    )}
                  />
                </button>

                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-64 animate-pop-in overflow-hidden rounded-2xl border border-line bg-paper p-2 shadow-soft"
                  >
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-smoke">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-shell"
                    >
                      <Package size={16} />
                      {t.nav.orders}
                    </Link>
                    <Link
                      href="/track"
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-shell"
                    >
                      <Truck size={16} />
                      {t.nav.track}
                    </Link>
                    {user.role === "admin" ? (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={closeMenus}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-shell"
                      >
                        <LayoutDashboard size={16} />
                        {t.nav.admin}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rust transition hover:bg-rust/5 disabled:opacity-50"
                    >
                      <LogOut size={16} />
                      {signingOut ? t.common.loading : t.nav.logout}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="hidden lg:block">
                <Link
                  href="/login"
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  <UserRound size={16} />
                  {t.nav.login}
                </Link>
              </div>
            )}

            <Link
              href="/cart"
              aria-label={cartLabel}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-paper text-ink transition hover:border-ink/30 hover:bg-shell sm:h-11 sm:w-11"
            >
              <ShoppingBag size={18} strokeWidth={1.8} />
              {hydrated && count > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rust px-1 text-[10px] font-bold leading-none text-paper">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                setMobileOpen((open) => !open);
              }}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t.a11y.closeMenu : t.a11y.openMenu}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper text-ink transition hover:border-ink/30 hover:bg-shell lg:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label={t.common.close}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.common.menu}
            className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-drawer-in flex-col bg-paper shadow-soft"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t.a11y.closeMenu}
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:bg-shell"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <nav className="flex flex-col gap-1" aria-label={t.common.menu}>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenus}
                      aria-current={link.active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition",
                        link.active
                          ? "bg-ink text-paper"
                          : "text-ink hover:bg-shell",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={18} />
                        {link.label}
                      </span>
                      <ArrowRight size={16} className="opacity-40" />
                    </Link>
                  );
                })}
                <Link
                  href="/cart"
                  onClick={closeMenus}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition",
                    pathname === "/cart"
                      ? "bg-ink text-paper"
                      : "text-ink hover:bg-shell",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag size={18} />
                    {t.nav.cart}
                    {hydrated && count > 0 ? (
                      <span className="rounded-full bg-rust px-2 py-0.5 text-[11px] font-bold leading-none text-paper">
                        {count}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight size={16} className="opacity-40" />
                </Link>
                {user ? (
                  <>
                    <Link
                      href="/orders"
                      onClick={closeMenus}
                      className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold text-ink transition hover:bg-shell"
                    >
                      <span className="flex items-center gap-3">
                        <Package size={18} />
                        {t.nav.orders}
                      </span>
                      <ArrowRight size={16} className="opacity-40" />
                    </Link>
                    <Link
                      href="/track"
                      onClick={closeMenus}
                      aria-current={pathname === "/track" ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition",
                        pathname === "/track"
                          ? "bg-ink text-paper"
                          : "text-ink hover:bg-shell",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Truck size={18} />
                        {t.nav.track}
                      </span>
                      <ArrowRight size={16} className="opacity-40" />
                    </Link>
                    {user.role === "admin" ? (
                      <Link
                        href="/admin"
                        onClick={closeMenus}
                        aria-current={
                          pathname.startsWith("/admin") ? "page" : undefined
                        }
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition",
                          pathname.startsWith("/admin")
                            ? "bg-ink text-paper"
                            : "text-ink hover:bg-shell",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <LayoutDashboard size={18} />
                          {t.nav.admin}
                        </span>
                        <ArrowRight size={16} className="opacity-40" />
                      </Link>
                    ) : null}
                  </>
                ) : null}
              </nav>

              <div className="my-6 h-px bg-line" />

              {user ? (
                <div>
                  <p className="eyebrow mb-3">{t.nav.account}</p>
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-shell/60 p-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rust text-sm font-bold text-paper">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-smoke">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="mt-3 flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-rust transition hover:bg-rust/5 disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    {signingOut ? t.common.loading : t.nav.logout}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/login"
                    onClick={closeMenus}
                    className={buttonClass({ variant: "primary", full: true })}
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenus}
                    className={buttonClass({ variant: "outline", full: true })}
                  >
                    {t.nav.register}
                  </Link>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-line p-5">
              <LanguageToggle />
              <p className="mt-3 text-[11px] leading-relaxed text-smoke">
                {t.announce.cod}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
