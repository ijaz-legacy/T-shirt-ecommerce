"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/components/providers/LanguageProvider";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/cn";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={cn("field pr-12", error && "field-error")}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-smoke transition hover:bg-shell hover:text-ink"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </FormField>
  );
}
