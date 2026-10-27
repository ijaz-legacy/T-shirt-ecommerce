import {
  SESSION_COOKIE,
  createSession,
  findUserByEmail,
  verifyAgainstDummyHash,
  verifyPassword,
} from "@/lib/auth";
import { apiError, apiJson, guardJsonMutation } from "@/lib/http";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sessionCookieOptions } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const guarded = guardJsonMutation(request);
    if (guarded) return guarded;

    const ip = getClientIp(request);
    const ipLimit = rateLimit(`login-ip:${ip}`, 20, 10 * 60 * 1000);
    if (!ipLimit.ok) return apiError("RATE_LIMITED", 429);

    const payload: unknown = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) return apiError("VALIDATION_ERROR", 400);

    const { email, password } = parsed.data;
    const emailLimit = rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimit.ok) return apiError("RATE_LIMITED", 429);

    const user = await findUserByEmail(email);
    if (!user) {
      await verifyAgainstDummyHash(password);
      return apiError("INVALID_CREDENTIALS", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return apiError("INVALID_CREDENTIALS", 401);

    const session = await createSession(user.id);
    const response = apiJson({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    response.cookies.set(
      SESSION_COOKIE,
      session.token,
      sessionCookieOptions(session.expiresAt),
    );
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return apiError("SERVER_ERROR", 500);
  }
}
