"use client";

import { useActionState, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [localError, setLocalError] = useState<string | null>(null);

  const urlError = searchParams.get("error");
  useEffect(() => {
    if (urlError === "no-role") {
      setLocalError(
        "Signed in, but your user account does not have a staff profile in the 'profiles' table. Please assign an 'admin', 'dispatcher', or 'hospital' role in Supabase.",
      );
    } else if (urlError) {
      setLocalError(`Authentication notice: ${urlError}`);
    }
  }, [urlError]);

  const activeError = state?.error || localError;

  return (
    <form action={formAction} className="card w-full max-w-sm p-6 space-y-4">
      <div className="flex flex-col items-center text-center pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/solace_icon.png"
          alt="Solace Emergency Dispatch"
          className="w-16 h-16 rounded-2xl shadow-lg mb-3 object-contain"
        />
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Solace</h1>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0091FF] mt-0.5">
          EMERGENCY DISPATCH • OPS PORTAL
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          Dispatcher, hospital intake, and fleet supervisor sign in.
        </p>
      </div>

      <label className="block text-sm">
        Email
        <input
          name="email"
          className="input mt-1"
          type="email"
          autoComplete="username"
          required
        />
      </label>

      <label className="block text-sm">
        Password
        <input
          name="password"
          className="input mt-1"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {activeError && (
        <div className="text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 leading-relaxed">
          {activeError}
        </div>
      )}

      <button className="btn btn-primary w-full py-2" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <div className="pt-2 flex flex-col items-center gap-2.5">
        <a
          href="/solace-driver.apk"
          download="solace-driver.apk"
          className="w-full py-2 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <span>📲</span>
          <span>Download Solace Driver APK (Android)</span>
        </a>

        <div className="flex items-center justify-between w-full text-xs text-[var(--muted)] px-1">
          <a
            href="/branding"
            className="text-[#00D4FF] hover:underline inline-flex items-center gap-1 font-medium"
          >
            🎨 App Logo & Branding Studio →
          </a>
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
          >
            Standalone tab ↗
          </a>
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <Suspense fallback={<div className="card p-6 text-sm text-[var(--muted)]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
