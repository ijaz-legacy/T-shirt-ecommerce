import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import type { UserPublic } from "@/lib/types";

export async function getCurrentUser(): Promise<UserPublic | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await getSessionUser(token);
}

export async function requireUser(returnTo: string): Promise<UserPublic> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export async function requireAdmin(returnTo: string): Promise<UserPublic> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

/** Admin or staff — for sections staff members are allowed to manage (orders). */
export async function requireStaffManager(returnTo: string): Promise<UserPublic> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin" && user.role !== "staff") {
    notFound();
  }
  return user;
}

export function isAdmin(user: UserPublic | null): boolean {
  return user?.role === "admin";
}

export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
