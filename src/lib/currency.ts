import type { Lang } from "@/lib/types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inr.format(amount);
}

export function formatDate(timestamp: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function formatDateTime(timestamp: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in values ? String(values[key]) : match;
  });
}
