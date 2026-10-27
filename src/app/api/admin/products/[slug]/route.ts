import { AdminProductError, updateAdminProduct } from "@/lib/admin";
import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { adminProductUpdateSchema, productSlugSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(
      `admin-products:${auth.user.id}`,
      120,
      60 * 60 * 1000,
    );
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const { slug: rawSlug } = await params;
    const slug = productSlugSchema.safeParse(rawSlug);
    if (!slug.success) return apiError("NOT_FOUND", 404);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = adminProductUpdateSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const product = await updateAdminProduct(slug.data, parsed.data);
    if (!product) return apiError("NOT_FOUND", 404);
    return apiJson({ product });
  } catch (error) {
    if (error instanceof AdminProductError) {
      return apiError(error.code, error.status);
    }
    console.error("Update product failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
