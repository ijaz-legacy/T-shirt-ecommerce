import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { dictionaries } from "@/lib/i18n/dictionary";
import { getLang } from "@/lib/lang";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = dictionaries[lang];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: {
      default: t.meta.title,
      template: "%s · IJAZ LEGACY",
    },
    description: t.meta.description,
    applicationName: "IJAZ LEGACY",
    openGraph: {
      type: "website",
      siteName: "IJAZ LEGACY",
      title: t.meta.title,
      description: t.meta.description,
      images: [
        {
          url: "/images/og.jpg",
          width: 1200,
          height: 630,
          alt: "IJAZ LEGACY printed and custom tees",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
      images: ["/images/og.jpg"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171512",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  const t = dictionaries[lang];
  const user = await getCurrentUser();

  return (
    <html lang={lang}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-paper"
        >
          {t.common.skipToContent}
        </a>
        <AppProviders initialLang={lang}>
          <Header user={user} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
