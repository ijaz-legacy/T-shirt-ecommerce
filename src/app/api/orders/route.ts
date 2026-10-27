import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { createOrder, OrderError } from "@/lib/orders";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { orderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const ip = getClientIp(request);
    const userLimit = rateLimit(`order-user:${user.id}`, 15, 60 * 60 * 1000);
    const ipLimit = rateLimit(`order-ip:${ip}`, 30, 60 * 60 * 1000);
    if (!userLimit.ok || !ipLimit.ok) return apiError("RATE_LIMITED", 429);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = orderSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const order = await createOrder(user, parsed.data);
    return apiJson({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return apiError(error.code, error.status);
    }
    console.error("Create order failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
