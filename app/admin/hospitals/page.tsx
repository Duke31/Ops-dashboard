import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");
  const { data, error } = await supabase.rpc("admin_list_hospitals");

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage hospitals</h1>
        <p className="text-sm text-[var(--muted)]">
          Full catalog from admin_list_hospitals, including sites with no
          staff or driver yet.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-1">{error.message}</p>
        )}
      </div>
      <HospitalManager hospitals={(data ?? []) as Hospital[]} />
    </AppShell>
  );
}
