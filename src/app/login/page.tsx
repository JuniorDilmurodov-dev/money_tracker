import { LoginForm } from "./login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.login };
}

export default async function LoginPage() {
  const { t } = await getT();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      {/* The switcher has to reach the signed-out screen too — otherwise the
          only way to change language is to get past a form you can't read. */}
      <div className="mb-8 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.appName}</h1>
      <p className="mt-1 text-sm text-ink-3">{t.login.tagline}</p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
