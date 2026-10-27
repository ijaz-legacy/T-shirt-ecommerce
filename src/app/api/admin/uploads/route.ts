import sharp from "sharp";
import { saveProductImage } from "@/lib/admin";
import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardMultipartMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

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

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(
      `admin-uploads:${auth.user.id}`,
      80,
      60 * 60 * 1000,
    );
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return apiError("FILE_REQUIRED", 400);
    if (file.size === 0) return apiError("FILE_REQUIRED", 400);
    if (file.size > MAX_BYTES) return apiError("FILE_TOO_LARGE", 413);
    if (!ACCEPTED_TYPES.has(file.type)) {
      return apiError("UNSUPPORTED_IMAGE", 415);
    }

    let processed: Buffer;
    try {
      const result = await sharp(Buffer.from(await file.arrayBuffer()), {
        failOn: "warning",
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize({
          width: 1000,
          height: 1250,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      if (result.info.format !== "webp") {
        return apiError("UNSUPPORTED_IMAGE", 415);
      }
      processed = result.data;
    } catch (error) {
      console.warn("Rejected product image upload", error);
      return apiError("INVALID_IMAGE", 400);
    }

    const id = await saveProductImage(processed, "image/webp");
    return apiJson({ path: `/api/images/${id}` }, 201);
  } catch (error) {
    console.error("Product image upload failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
