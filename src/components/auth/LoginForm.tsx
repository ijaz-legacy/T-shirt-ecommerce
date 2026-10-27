"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormField } from "@/components/ui/FormField";
import { buttonClass } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";
import type { UserPublic } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm({ next }: { next: string }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registerHref =
    next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = t.errors.required;
    else if (!EMAIL_RE.test(trimmedEmail)) errors.email = t.errors.emailInvalid;
    if (!password) errors.password = t.errors.required;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const result = await postJson<{ user: UserPublic }>("/api/auth/login", {
      email: trimmedEmail,
      password,
    });

    if (result.ok) {
      window.location.assign(next);
      return;
    }

    setFormError(getErrorMessage(t, result.code));
    setSubmitting(false);
  }

  return (
    <div>
      <p className="eyebrow">{t.auth.loginEyebrow}</p>
      <h1 className="display-title mt-2 text-3xl sm:text-4xl">
        {t.auth.loginTitle}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-smoke">
        {t.auth.loginSubtitle}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-rust/25 bg-rust/5 px-4 py-3 text-xs font-medium leading-relaxed text-rust"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {formError}
          </div>
        ) : null}

        <FormField id="login-email" label={t.auth.email} error={fieldErrors.email}>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }
            }}
            placeholder={t.auth.emailPlaceholder}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "login-email-error" : undefined
            }
            className={cn("field", fieldErrors.email && "field-error")}
          />
        </FormField>

        <PasswordField
          id="login-password"
          label={t.auth.password}
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors((current) => ({
                ...current,
                password: undefined,
              }));
            }
          }}
          placeholder={t.auth.passwordPlaceholder}
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <button
          type="submit"
          disabled={submitting}
          className={buttonClass({ full: true, size: "lg", className: "mt-1" })}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t.auth.loginLoading}
            </>
          ) : (
            <>
              {t.auth.loginButton}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-smoke">{t.auth.noAccount}</span>
        <Link
          href={registerHref}
          className="font-semibold underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          {t.auth.goRegister}
        </Link>
      </div>

      <div className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-smoke">
        {t.auth.needHelp}{" "}
        <a
          href={`mailto:${t.footer.email}`}
          className="font-medium text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          {t.auth.needHelpEmail}
        </a>
      </div>
    </div>
  );
}
