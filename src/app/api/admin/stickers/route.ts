import sharp from "sharp";
import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardMultipartMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createSticker, listStickers } from "@/lib/stickers";
import { CATEGORY_UPLOAD_SIZE, isStickerCategory } from "@/lib/catalog";
import { stickerInputSchema } from "@/lib/validation";

const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/webp",
  "image/avif",
  "image/jpeg",
]);

function parseStickerForm(form: FormData) {
  const activeRaw = form.get("active");
  const sortRaw = form.get("sortOrder");
  const candidate = {
    nameEn: typeof form.get("nameEn") === "string" ? String(form.get("nameEn")) : "",
    nameTa: typeof form.get("nameTa") === "string" ? String(form.get("nameTa")) : "",
    active: activeRaw === "true" || activeRaw === "1",
    sortOrder: Number(sortRaw),
    category: String(form.get("category") ?? "small"),
  };
  const parsed = stickerInputSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

async function processStickerImage(file: File, category?: string): Promise<Buffer | null> {
  const maxSize = isStickerCategory(category)
    ? CATEGORY_UPLOAD_SIZE[category]
    : 800;
  try {
    const result = await sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90, alphaQuality: 95 })
      .toBuffer({ resolveWithObject: true });
    return result.info.format === "webp" ? result.data : null;
  } catch (error) {
    console.warn("Rejected sticker image upload", error);
    return null;
  }
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  return apiJson({ stickers: await listStickers(true) });
}

export async function POST(request: Request) {
  try {
    const guarded = guardMultipartMutation(request);
    if (guarded) return guarded;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(`admin-stickers:${auth.user.id}`, 60, 60 * 60 * 1000);
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const form = await request.formData().catch(() => null);
    if (!form) return apiError("INVALID_INPUT", 400);

    const input = parseStickerForm(form);
    if (!input) return apiError("INVALID_INPUT", 400);

    const file = form.get("file");
    if (!(file instanceof File)) return apiError("FILE_REQUIRED", 400);
    if (file.size === 0) return apiError("FILE_REQUIRED", 400);
    if (file.size > MAX_BYTES) return apiError("FILE_TOO_LARGE", 413);
    if (!ACCEPTED_TYPES.has(file.type)) {
      return apiError("UNSUPPORTED_IMAGE", 415);
    }

    const processed = await processStickerImage(file, input.category);
    if (!processed) return apiError("INVALID_IMAGE", 400);

    const sticker = await createSticker(input, processed, "image/webp");
    return apiJson({ sticker }, 201);
  } catch (error) {
    console.error("Sticker create failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
