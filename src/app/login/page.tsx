import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Xarajat" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Xarajat</h1>
      <p className="mt-1 text-sm text-ink-3">
        Track spending in so&apos;m. Synced across your devices.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
