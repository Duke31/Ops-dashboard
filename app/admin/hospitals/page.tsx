import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";
import { HospitalManager } from "@/components/HospitalManager";

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");

  // Fetch directly from hospitals table - guaranteed to work without broken RPCs
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity, lat, lng, intake_phone, created_at")
    .order("name");

  const hospitals = (data ?? []) as Hospital[];

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Manage Hospitals</h1>
        <p className="text-xs text-[var(--muted)]">
          Full catalog of hospital sites, emergency intake numbers, and bed capacities.
        </p>
        {error && (
          <p className="text-xs text-[#b42318] mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
            {error.message}
          </p>
        )}
      </div>
      <HospitalManager hospitals={hospitals} />
    </AppShell>
  );
}