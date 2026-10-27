import {
  createSession,
  createUser,
  findUserByEmail,
  hashPassword,
} from "@/lib/auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sessionCookieOptions } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const ip = getClientIp(request);
    const limited = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!limited.ok) return apiError("RATE_LIMITED", 429);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const { name, email, password } = parsed.data;

    if (await findUserByEmail(email)) {
      return apiError("EMAIL_TAKEN", 409);
    }

    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await createUser({ name, email, passwordHash });
    } catch (error) {
      if (await findUserByEmail(email)) return apiError("EMAIL_TAKEN", 409);
      throw error;
    }

    const session = await createSession(user.id);
    const response = apiJson({ user });
    response.cookies.set(
      SESSION_COOKIE,
      session.token,
      sessionCookieOptions(session.expiresAt),
    );
    return response;
  } catch (error) {
    console.error("Register failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
