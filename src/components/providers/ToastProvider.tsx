"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/components/providers/LanguageProvider";

export interface ToastInput {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  tone?: "default" | "error";
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { id, ...toast }]);
      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 lg:bottom-6"
      >
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex animate-pop-in items-start gap-3 rounded-2xl border px-4 py-3 shadow-soft",
                toast.tone === "error"
                  ? "border-rust/30 bg-[#2A1612] text-paper"
                  : "border-ink/10 bg-ink text-paper",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                  toast.tone === "error"
                    ? "bg-rust/25 text-rust-soft"
                    : "bg-paper/10 text-gold",
                )}
              >
                {toast.tone === "error" ? (
                  <AlertCircle size={14} strokeWidth={2.2} />
                ) : (
                  <Check size={14} strokeWidth={2.5} />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-semibold leading-snug">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs text-paper/65">{toast.description}</p>
                ) : null}
                {toast.href && toast.hrefLabel ? (
                  <Link
                    href={toast.href}
                    onClick={() => dismiss(toast.id)}
                    className="mt-2 inline-flex text-xs font-semibold text-gold underline underline-offset-4"
                  >
                    {toast.hrefLabel}
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t.a11y.closeToast}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-paper/50 transition hover:bg-paper/10 hover:text-paper"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}
