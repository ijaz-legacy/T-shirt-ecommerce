import { getDb } from "@/lib/db";
import { apiError, apiJson } from "@/lib/http";

export async function GET() {
  try {
    const client = await getDb();
    await client.execute("SELECT 1");
    return apiJson({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return apiError("UNHEALTHY", 503);
  }
}
