import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/catalog";
import { fill, formatINR } from "@/lib/currency";
import { getDictionary } from "@/lib/lang";

export async function Footer() {
  const { t } = await getDictionary();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-paper sm:mt-20">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.1fr] lg:gap-12">
          <div>
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
              {t.footer.blurb}
            </p>
            <p className="accent-serif mt-6 text-2xl text-gold">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
              {t.footer.explore}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/shop"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.shop}
                </Link>
              </li>
              <li>
                <Link
                  href="/customize"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.customize}
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.cart}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
              {t.footer.account}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/orders"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.orders}
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.track}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.login}
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-paper/75 transition hover:text-paper"
                >
                  {t.nav.register}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
              {t.footer.help}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-paper/75">
              <li className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                {t.footer.cod}
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                {fill(t.footer.shipping, {
                  threshold: formatINR(FREE_SHIPPING_THRESHOLD),
                })}
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                {t.footer.returns}
              </li>
            </ul>
            <div className="mt-6">
              <p className="text-sm font-semibold">{t.footer.contact}</p>
              <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-paper/50">
                {t.footer.contactText}
              </p>
              <a
                href={`mailto:${t.footer.email}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold underline decoration-gold/30 underline-offset-4 transition hover:decoration-gold"
              >
                {t.footer.email}
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-paper/10 pt-6 text-[11px] text-paper/45 sm:flex-row sm:items-center sm:justify-between">
          <p>{fill(t.footer.copyright, { year })}</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {t.footer.cod}
          </p>
        </div>
      </div>
    </footer>
  );
}
