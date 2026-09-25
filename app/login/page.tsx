"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { homeForRole } from "@/lib/roles";
import type { AppRole, Profile } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !data.user) {
      setBusy(false);
      setError(authError?.message || "Sign-in failed.");
      return;
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, role, hospital_id, display_name")
      .eq("user_id", data.user.id)
      .maybeSingle<Profile>();

    setBusy(false);
    if (pErr || !profile) {
      setError(
        pErr?.message ||
          "Signed in, but no staff profile / role was found for this account.",
      );
      return;
    }
    router.replace(homeForRole(String(profile.role)));
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-5 space-y-4">
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
            className="input mt-1"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="input mt-1"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="text-sm text-[#b42318] bg-[#fef3f2] rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full py-2" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
