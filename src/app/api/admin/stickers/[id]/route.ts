import sharp from "sharp";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardMultipartMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { deleteSticker, getStickerRecord, updateSticker } from "@/lib/stickers";
import { CATEGORY_UPLOAD_SIZE, isStickerCategory } from "@/lib/catalog";
import { uuidSchema } from "@/lib/validation";

const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/webp",
  "image/avif",
  "image/jpeg",
  "image/svg+xml",
]);

const patchFormSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameTa: z.string().trim().min(2).max(90),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  category: z.enum(["small", "medium", "large"]).default("small"),
});

async function processStickerImage(
  file: File,
  category?: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (file.type === "image/svg+xml") {
    try {
      const text = await file.text();
      if (!text.toLowerCase().includes("<svg")) return null;
      return { buffer: Buffer.from(text, "utf-8"), mime: "image/svg+xml" };
    } catch {
      return null;
    }
  }

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
    return result.info.format === "webp"
      ? { buffer: result.data, mime: "image/webp" }
      : null;
  } catch (error) {
    console.warn("Rejected sticker image upload", error);
    return null;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return apiError("NOT_FOUND", 404);

    const guarded = guardMultipartMutation(request);
    if (guarded) return guarded;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(`admin-stickers:${auth.user.id}`, 60, 60 * 60 * 1000);
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const existing = await getStickerRecord(parsedId.data);
    if (!existing) return apiError("NOT_FOUND", 404);

    const form = await request.formData().catch(() => null);
    if (!form) return apiError("INVALID_INPUT", 400);

    const activeRaw = form.get("active");
    const input = patchFormSchema.safeParse({
      nameEn: form.get("nameEn"),
      nameTa: form.get("nameTa"),
      active: activeRaw === "true" || activeRaw === "1",
      sortOrder: Number(form.get("sortOrder")),
      category: String(form.get("category") ?? "small"),
    });
    if (!input.success) return apiError("INVALID_INPUT", 400);

    let processed: { buffer: Buffer; mime: string } | null = null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) return apiError("FILE_TOO_LARGE", 413);
      if (!ACCEPTED_TYPES.has(file.type)) {
        return apiError("UNSUPPORTED_IMAGE", 415);
      }
      processed = await processStickerImage(file, input.data.category);
      if (!processed) return apiError("INVALID_IMAGE", 400);
    }

    const sticker = await updateSticker(
      parsedId.data,
      input.data,
      processed ? processed.buffer : null,
      processed ? processed.mime : "image/webp",
    );
    if (!sticker) return apiError("NOT_FOUND", 404);
    return apiJson({ sticker });
  } catch (error) {
    console.error("Sticker update failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return apiError("NOT_FOUND", 404);

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const removed = await deleteSticker(parsedId.data);
    if (!removed) return apiError("NOT_FOUND", 404);
    return apiJson({ ok: true });
  } catch (error) {
    console.error("Sticker delete failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
