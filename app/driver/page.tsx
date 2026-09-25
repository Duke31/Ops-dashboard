"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DriverRestPage() {
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
        <h1 className="text-lg font-semibold">Driver desk is not this app</h1>
        <p className="text-sm text-[var(--muted)]">
          Sign out, then use an admin, dispatcher, or hospital account.
        </p>
        <button className="btn btn-primary w-full" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
