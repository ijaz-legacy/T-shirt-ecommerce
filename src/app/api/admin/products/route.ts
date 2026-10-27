import { AdminProductError, createAdminProduct } from "@/lib/admin";
import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { adminProductCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(
      `admin-products:${auth.user.id}`,
      60,
      60 * 60 * 1000,
    );
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = adminProductCreateSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const product = await createAdminProduct(parsed.data);
    return apiJson({ product }, 201);
  } catch (error) {
    if (error instanceof AdminProductError) {
      return apiError(error.code, error.status);
    }
    console.error("Create product failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
