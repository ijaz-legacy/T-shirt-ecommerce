import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getDictionary } from "@/lib/lang";
import { safeNextPath } from "@/lib/nav";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.auth.registerTitle,
    description: t.auth.registerSubtitle,
  };
}

export default async function RegisterPage({
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
      <RegisterForm next={next} />
    </AuthShell>
  );
}
