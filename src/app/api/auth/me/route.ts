import { apiJson } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  return apiJson({ user });
}
