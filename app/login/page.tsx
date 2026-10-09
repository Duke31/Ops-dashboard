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

  const [signingOut, setSigningOut] = useState(false);
  const [reauthNotice, setReauthNotice] = useState<string | null>(null);

  // If user requested fresh re-auth (?reauth=1) or was directed from staff sign in
  useEffect(() => {
    const shouldReauth = searchParams.get("reauth") === "1";
    if (shouldReauth) {
      const clearExisting = async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
          setReauthNotice("Existing session cleared. Please enter your credentials to authenticate.");
        } catch {
          // Ignore
        }
      };
      clearExisting();
    }
  }, [searchParams]);

  const handleSignOutFirst = async () => {
    setSigningOut(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      setReauthNotice("Signed out of all active sessions. Ready for fresh login.");
      setLocalError(null);
    } catch (e: any) {
      setLocalError(e?.message || "Failed to clear session.");
    } finally {
      setSigningOut(false);
    }
  };

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

      {reauthNotice && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2 leading-relaxed">
          {reauthNotice}
        </div>
      )}

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
        <div className="text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 leading-relaxed space-y-1">
          <div>{activeError}</div>
          <button
            type="button"
            onClick={handleSignOutFirst}
            className="text-[11px] underline text-red-600 dark:text-red-400 font-semibold cursor-pointer"
          >
            Clear current session &amp; sign out first
          </button>
        </div>
      )}

      <button className="btn btn-primary w-full py-2" disabled={isPending || signingOut}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <div className="pt-2 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={handleSignOutFirst}
          disabled={signingOut}
          className="w-full py-1.5 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition flex items-center justify-center gap-1.5"
        >
          <span>🔒</span>
          <span>{signingOut ? "Clearing session…" : "Shared device? Sign out first"}</span>
        </button>

        <div className="flex items-center justify-between w-full text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
          <a
            href="/request-access"
            className="text-[#00D4FF] hover:underline font-semibold"
          >
            Request Staff Access →
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
