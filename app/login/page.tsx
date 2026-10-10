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
    if (urlError === "no-role" || urlError === "unauthorized") {
      setLocalError("Unauthorized: Access restricted to authorized operational staff only.");
    } else if (urlError) {
      setLocalError("Unauthorized: Access restricted to authorized operational staff only.");
    }
  }, [urlError]);

  // Silently clear existing session if arriving via staff sign in with ?reauth=1
  useEffect(() => {
    const shouldReauth = searchParams.get("reauth") === "1";
    if (shouldReauth) {
      const clearExisting = async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch {
          // Ignore
        }
      };
      clearExisting();
    }
  }, [searchParams]);

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
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Solace EMS</h1>
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
        <div className="flex items-center justify-between w-full text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
          <a
            href="/register"
            className="text-emerald-500 hover:underline font-semibold"
          >
            Client Sign Up →
          </a>
          <a
            href="/"
            className="hover:underline text-[var(--muted)]"
          >
            ← Public Site
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
