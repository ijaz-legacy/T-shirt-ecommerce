import { getProductImage } from "@/lib/admin";
import { apiError } from "@/lib/http";
import { uuidSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return apiError("NOT_FOUND", 404);

  const image = await getProductImage(parsed.data);
  if (!image) return apiError("NOT_FOUND", 404);

  const body = new Uint8Array(image.bytes);
  return new Response(body, {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
