import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  hint,
  error,
  aside,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  aside?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside ? (
          <span className="text-[11px] font-normal text-smoke">{aside}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="error-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="helper">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
