import type { Metadata } from "next";
import Image from "next/image";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getDictionary } from "@/lib/lang";
import { getCurrentUser } from "@/lib/session";
import { listUserDesigns, countUserDesigns, deleteUserDesign } from "@/lib/user-designs";

export const metadata: Metadata = {
  title: "My Designs",
};

export default async function UserDesignsPage() {
  const { lang, t } = await getDictionary();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container-page py-8 sm:py-12">
        <p className="text-center text-smoke">
          {t.auth.needHelp}
          <a href="/login?next=%2Fuser-designs" className="underline decoration-line underline-offset-4 text-ink">
            Sign in to view designs
          </a>
        </p>
      </div>
    );
  }

  const total = await countUserDesigns(user.id);
  const designs = await listUserDesigns(user.id);

  return (
    <div className="container-page py-8 sm:py-12 lg:py-16">
      <div className="max-w-4xl mx-auto">

        <h2 className="font-display text-xl font-bold tracking-[-0.02em] mb-4">
          {t.custom.yourDesigns}
        </h2>

        {total === 0 ? (
          <p className="text-center text-smoke text-base">
            {t.custom.yourDesignsEmpty}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {designs.map((design) => {
              return (
                <div
                  key={design.id}
                  className="relative rounded-xl border border-line bg-shell p-3 group hover:border-ink/40 hover:bg-shell/30 cursor-pointer"
                >
                  <Image
                    src={design.image}
                    alt={design.name || "Your design"}
                    className="w-full h-40 object-cover rounded-t-xl transition-transform duration-300 group-hover:scale-105"
                    placeholder="blur"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-2 text-xs text-smoke">
                    {design.name || "Untitled"}
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = "/customize";
                    }}
                    className="absolute top-2 right-2 rounded-full bg-white/90 shadow-sm hover:bg-white transition p-2"
                    aria-label="Place this design"
                  >
                    Create
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-line">
          <button
            onClick={() => {
              window.location.href = "/customize";
            }}
            className="w-full rounded-xl bg-ink text-paper px-6 py-3 text-lg font-medium transition hover:bg-ink/90">
            {t.custom.uploadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
