import { STICKERS } from "@/lib/catalog";
import { apiJson } from "@/lib/http";
import { listStickers } from "@/lib/stickers";

export async function GET() {
  const custom = await listStickers(false);
  return apiJson({ builtin: STICKERS, custom });
}
