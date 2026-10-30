import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";
import { deleteUserDesign } from "@/lib/user-designs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const { id } = await params;
  const deleted = await deleteUserDesign(user.id, id);
  if (!deleted) return apiError("NOT_FOUND", 404);

  return apiJson({ ok: true });
}
