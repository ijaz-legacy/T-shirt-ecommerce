import type { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";
import type { UserPublic } from "@/lib/types";

type AdminApiResult =
  | { user: UserPublic; response?: never }
  | { user?: never; response: NextResponse };

export async function requireAdminApi(): Promise<AdminApiResult> {
  const user = await getCurrentUser();
  if (!user) return { response: apiError("UNAUTHORIZED", 401) };
  if (user.role !== "admin") return { response: apiError("FORBIDDEN", 403) };
  return { user };
}

/** Admin or staff — for order management endpoints staff may operate. */
export async function requireStaffApi(): Promise<AdminApiResult> {
  const user = await getCurrentUser();
  if (!user) return { response: apiError("UNAUTHORIZED", 401) };
  if (user.role !== "admin" && user.role !== "staff") {
    return { response: apiError("FORBIDDEN", 403) };
  }
  return { user };
}
