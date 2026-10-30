import type { Metadata } from "next";
import { StickerManager } from "@/components/admin/StickerManager";
import { listStickers } from "@/lib/stickers";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Stickers" };

export default async function AdminStickersPage() {
  // Staff accounts manage orders only — stickers stay owner-only.
  await requireAdmin("/admin/stickers");
  const stickers = await listStickers(true);
  return <StickerManager initialStickers={stickers} />;
}
