import { cookies } from "next/headers";
import { SESSION_COOKIE, deleteSession } from "@/lib/auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) await deleteSession(token);

    const response = apiJson({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("Logout failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
