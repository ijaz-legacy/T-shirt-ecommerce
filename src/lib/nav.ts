export function safeNextPath(
  value: string | string[] | undefined | null,
  fallback = "/",
): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}
