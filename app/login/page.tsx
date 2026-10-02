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
    <form action={formAction} className="card w-full max-w-sm p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Ops Dashboard
        </div>
        <h1 className="text-xl font-semibold mt-1">Staff sign in</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Dispatcher, hospital, and admin access only.
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
        <div className="text-xs text-[#b42318] bg-[#fef3f2] border border-[#fecdca] rounded-md px-3 py-2 leading-relaxed">
          {activeError}
        </div>
      )}

      <button className="btn btn-primary w-full py-2" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <div className="pt-2 text-center">
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--muted)] hover:underline inline-flex items-center gap-1"
        >
          Open standalone tab ↗
        </a>
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
