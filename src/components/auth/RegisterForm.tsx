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
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export function RegisterForm({ next }: { next: string }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loginHref =
    next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) errors.name = t.errors.nameShort;
    if (!trimmedEmail) errors.email = t.errors.required;
    else if (!EMAIL_RE.test(trimmedEmail)) errors.email = t.errors.emailInvalid;

    if (password.length < 8) errors.password = t.errors.passwordShort;
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = t.errors.passwordWeak;
    }

    if (!confirm) errors.confirm = t.errors.required;
    else if (confirm !== password) errors.confirm = t.errors.passwordMismatch;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const result = await postJson<{ user: UserPublic }>("/api/auth/register", {
      name: trimmedName,
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
      <p className="eyebrow">{t.auth.registerEyebrow}</p>
      <h1 className="display-title mt-2 text-3xl sm:text-4xl">
        {t.auth.registerTitle}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-smoke">
        {t.auth.registerSubtitle}
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

        <FormField id="register-name" label={t.auth.name} error={fieldErrors.name}>
          <input
            id="register-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldErrors.name) {
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }
            }}
            placeholder={t.auth.namePlaceholder}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "register-name-error" : undefined
            }
            className={cn("field", fieldErrors.name && "field-error")}
          />
        </FormField>

        <FormField id="register-email" label={t.auth.email} error={fieldErrors.email}>
          <input
            id="register-email"
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
              fieldErrors.email ? "register-email-error" : undefined
            }
            className={cn("field", fieldErrors.email && "field-error")}
          />
        </FormField>

        <PasswordField
          id="register-password"
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
          autoComplete="new-password"
          hint={t.auth.passwordHint}
          error={fieldErrors.password}
        />

        <PasswordField
          id="register-confirm"
          label={t.auth.confirmPassword}
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            if (fieldErrors.confirm) {
              setFieldErrors((current) => ({
                ...current,
                confirm: undefined,
              }));
            }
          }}
          placeholder={t.auth.confirmPlaceholder}
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />

        <button
          type="submit"
          disabled={submitting}
          className={buttonClass({ full: true, size: "lg", className: "mt-1" })}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t.auth.registerLoading}
            </>
          ) : (
            <>
              {t.auth.registerButton}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-smoke">{t.auth.haveAccount}</span>
        <Link
          href={loginHref}
          className="font-semibold underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          {t.auth.goLogin}
        </Link>
      </div>
    </div>
  );
}
