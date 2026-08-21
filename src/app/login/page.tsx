import { LoginForm } from "./login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ErrorText } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.login };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { t } = await getT();

  // Set by /auth/confirm when an email link doesn't check out. Without this the
  // reader is dropped back on the form with no idea their link was the problem.
  const { error } = await searchParams;
  const linkProblem =
    error === "expired" ? t.login.linkExpired : error === "invalid" ? t.login.linkInvalid : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      {/* The switcher has to reach the signed-out screen too — otherwise the
          only way to change language is to get past a form you can't read. */}
      <div className="mb-8 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.appName}</h1>
      <p className="mt-1 text-sm text-ink-3">{t.login.tagline}</p>
      {linkProblem && (
        <div className="mt-6">
          <ErrorText>{linkProblem}</ErrorText>
        </div>
      )}
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
