import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, name, address, lat, lng, intake_phone, available_capacity, created_at")
    .order("name");

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage hospitals</h1>
        <p className="text-sm text-[var(--muted)]">
          Saves through admin_save_hospital. Direct table writes are not used.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-1">{error.message}</p>
        )}
      </div>
      <HospitalManager hospitals={(data ?? []) as Hospital[]} />
    </AppShell>
  );
}
