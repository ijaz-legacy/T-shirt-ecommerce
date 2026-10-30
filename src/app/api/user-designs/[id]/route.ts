import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  deleteUserDesign,
  getUserDesign,
  updateSavedUserDesign,
} from "@/lib/user-designs";
import { savedDesignSchema, uuidSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return apiError("NOT_FOUND", 404);

  const design = await getUserDesign(user.id, parsedId.data);
  if (!design || !design.config) return apiError("NOT_FOUND", 404);
  return apiJson({ design });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);
  const limit = rateLimit(`user-design-save:${user.id}`, 300, 60 * 60 * 1000);
  if (!limit.ok) return apiError("RATE_LIMITED", 429);

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return apiError("NOT_FOUND", 404);
  const body: unknown = await request.json().catch(() => null);
  const parsed = savedDesignSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

  const updated = await updateSavedUserDesign(
    user.id,
    parsedId.data,
    parsed.data.name,
    parsed.data.config,
  );
  if (!updated) return apiError("NOT_FOUND", 404);
  return apiJson({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return apiError("NOT_FOUND", 404);
  const deleted = await deleteUserDesign(user.id, parsedId.data);
  if (!deleted) return apiError("NOT_FOUND", 404);

  return apiJson({ ok: true });
}
