import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");

  let hospitals: Hospital[] = [];
  let errorMsg: string | null = null;

  try {
    // 1. Try admin_list_hospitals RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_list_hospitals");

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      hospitals = rpcData as Hospital[];
    } else {
      // 2. Direct table fallback (guaranteed to work with standard Postgres table)
      const { data: tableData, error: tableError } = await supabase
        .from("hospitals")
        .select("id, name, address, available_capacity, lat, lng, intake_phone, created_at")
        .order("name");

      if (tableError) {
        errorMsg = tableError.message;
      } else if (tableData) {
        hospitals = tableData as Hospital[];
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Error loading hospitals catalog";
  }

  // Filter out any potential null/undefined rows to prevent client-side crash
  const safeHospitals = hospitals.filter((h) => h && typeof h === "object" && h.id);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Manage Hospitals</h1>
        <p className="text-xs text-[var(--muted)]">
          Full catalog of hospital sites, ER intake phone lines, coordinates, and bed capacity.
        </p>
        {errorMsg && (
          <p className="text-xs text-[#b42318] mt-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded">
            {errorMsg}
          </p>
        )}
      </div>

      <HospitalManager hospitals={safeHospitals} />
    </AppShell>
  );
}