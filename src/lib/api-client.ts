export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; status: number };

async function requestJson<T>(
  url: string,
  init: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const code =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : "SERVER_ERROR";
      return { ok: false, code, status: response.status };
    }

    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", status: 0 };
  }
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function postJson<T>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return requestJson<T>(url, jsonInit("POST", body));
}

export function patchJson<T>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return requestJson<T>(url, jsonInit("PATCH", body));
}

export function postForm<T>(
  url: string,
  body: FormData,
): Promise<ApiResult<T>> {
  return requestJson<T>(url, { method: "POST", body });
}
