import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { countUserDesigns, createSavedUserDesign, listUserDesigns } from "@/lib/user-designs";
import { savedDesignSchema } from "@/lib/validation";

const MAX_DESIGNS = 50;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);
  const designs = (await listUserDesigns(user.id)).filter((design) => design.imageId);
  return apiJson({ designs });
}

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const limit = rateLimit(`user-designs:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return apiError("RATE_LIMITED", 429);

  const body: unknown = await request.json().catch(() => null);
  const parsed = savedDesignSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

  const count = await countUserDesigns(user.id);
  if (count >= MAX_DESIGNS) return apiError("DESIGNS_LIMIT", 400);

  const design = await createSavedUserDesign(
    user.id,
    parsed.data.name,
    parsed.data.config,
  );
  return apiJson({ design }, 201);
}
