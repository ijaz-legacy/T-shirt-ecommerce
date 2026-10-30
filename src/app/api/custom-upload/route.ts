import sharp from "sharp";
import { saveProductImage } from "@/lib/admin";
import { apiError, apiJson, guardMultipartMutation } from "@/lib/http";
import { createUserDesign } from "@/lib/user-designs";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { CATEGORY_UPLOAD_SIZE, isStickerCategory } from "@/lib/catalog";

const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: Request) {
  try {
    const guarded = guardMultipartMutation(request);
    if (guarded) return guarded;

    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const limit = rateLimit(`custom-upload:${user.id}`, 20, 60 * 60 * 1000);
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const rawCategory = form?.get("category");
    const category = isStickerCategory(rawCategory) ? rawCategory : "medium";

    if (!(file instanceof File)) return apiError("FILE_REQUIRED", 400);
    if (file.size === 0) return apiError("FILE_REQUIRED", 400);
    if (file.size > MAX_BYTES) return apiError("FILE_TOO_LARGE", 413);
    if (!ACCEPTED_TYPES.has(file.type)) {
      return apiError("UNSUPPORTED_IMAGE", 415);
    }

    const maxSize = CATEGORY_UPLOAD_SIZE[category];

    let processed: Buffer;
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
        .webp({ quality: 85, alphaQuality: 95 })
        .toBuffer({ resolveWithObject: true });
      if (result.info.format !== "webp") {
        return apiError("UNSUPPORTED_IMAGE", 415);
      }
      processed = result.data;
    } catch (error) {
      console.warn("Rejected custom image upload", error);
      return apiError("INVALID_IMAGE", 400);
    }

    const id = await saveProductImage(processed, "image/webp", "custom-upload");
    await createUserDesign(user.id, id, "", category);
    return apiJson({ id, path: `/api/images/${id}`, category }, 201);
  } catch (error) {
    console.error("Custom image upload failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
