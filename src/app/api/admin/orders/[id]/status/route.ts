import { requireAdminApi } from "@/lib/api-auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { OrderError, updateOrderStatus } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { orderStatusUpdateSchema, uuidSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const limit = rateLimit(
      `admin-orders:${auth.user.id}`,
      240,
      60 * 60 * 1000,
    );
    if (!limit.ok) return apiError("RATE_LIMITED", 429);

    const { id } = await params;
    const orderId = uuidSchema.safeParse(id);
    if (!orderId.success) return apiError("NOT_FOUND", 404);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = orderStatusUpdateSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const order = await updateOrderStatus(
      orderId.data,
      parsed.data.status,
      parsed.data.note || null,
    );
    return apiJson({ order });
  } catch (error) {
    if (error instanceof OrderError) {
      return apiError(error.code, error.status);
    }
    console.error("Update order status failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
