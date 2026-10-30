import { apiError, apiJson } from "@/lib/http";
import { getAdminStats } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return apiError("FORBIDDEN", 403);

  try {
    const stats = await getAdminStats();
    return apiJson(stats);
  } catch (error) {
    console.error("Admin stats failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}