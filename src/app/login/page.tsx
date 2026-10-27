import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/lang";
import { safeNextPath } from "@/lib/nav";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.auth.loginTitle,
    description: t.auth.loginSubtitle,
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = safeNextPath(params.next, "/");
  const next =
    rawNext.startsWith("/login") || rawNext.startsWith("/register")
      ? "/"
      : rawNext;

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}
