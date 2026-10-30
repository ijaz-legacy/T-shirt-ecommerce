import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { countUserDesigns, createUserDesign, listUserDesigns } from "@/lib/user-designs";
import { isStickerCategory } from "@/lib/catalog";

const MAX_DESIGNS = 50;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);
  const designs = await listUserDesigns(user.id);
  return apiJson({ designs });
}

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const limit = rateLimit(`user-designs:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return apiError("RATE_LIMITED", 429);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("INVALID_BODY", 400);

  const { imageId, name, category } = body as {
    imageId?: string;
    name?: string;
    category?: string;
  };
  if (!imageId || typeof imageId !== "string") return apiError("IMAGE_REQUIRED", 400);

  const count = await countUserDesigns(user.id);
  if (count >= MAX_DESIGNS) return apiError("DESIGNS_LIMIT", 400);

  const safeName = typeof name === "string" ? name.trim().slice(0, 100) : "";
  const safeCategory = isStickerCategory(category) ? category : "medium";

  const design = await createUserDesign(user.id, imageId, safeName, safeCategory);
  return apiJson({ design }, 201);
}
