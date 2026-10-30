import { apiError, apiJson } from "@/lib/http";
import { getAdminStats } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const stats = await getAdminStats();
    return apiJson(stats);
  } catch (error) {
    console.error("Admin stats failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}