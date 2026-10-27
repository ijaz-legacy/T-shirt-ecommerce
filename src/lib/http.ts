import { NextResponse } from "next/server";

export function apiJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function apiError(code: string, status = 400): NextResponse {
  return apiJson({ error: code }, status);
}

export function guardOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return apiError("FORBIDDEN", 403);
  }

  const allowedHosts = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
  ].filter(Boolean);
  if (!allowedHosts.includes(originHost)) {
    return apiError("FORBIDDEN", 403);
  }
  return null;
}

export function guardJsonMutation(request: Request): NextResponse | null {
  const originError = guardOrigin(request);
  if (originError) return originError;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return apiError("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  return null;
}

export function guardMultipartMutation(request: Request): NextResponse | null {
  const originError = guardOrigin(request);
  if (originError) return originError;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return apiError("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  return null;
}
