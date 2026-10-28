import type { Metadata } from "next";
import { StickerManager } from "@/components/admin/StickerManager";
import { listStickers } from "@/lib/stickers";

export const metadata: Metadata = { title: "Stickers" };

export default async function AdminStickersPage() {
  const stickers = await listStickers(true);
  return <StickerManager initialStickers={stickers} />;
}
