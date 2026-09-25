"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NoAccessPage() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="card max-w-sm w-full p-5 space-y-3">
        <h1 className="text-lg font-semibold">This app is staff-only</h1>
        <p className="text-sm text-[var(--muted)]">
          Driver and client accounts cannot use the Ops Dashboard. Sign out,
          then sign in with an admin, dispatcher, or hospital desk account.
        </p>
        <button className="btn btn-primary w-full" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
