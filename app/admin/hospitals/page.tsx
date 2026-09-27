import * as AppShellModule from "@/components/AppShell";
import * as HospitalManagerModule from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

// Bulletproof import resolution to prevent "Element type is invalid: expected a string or class/function but got: undefined"
const AppShell =
  (AppShellModule as any).AppShell ||
  (AppShellModule as any).default ||
  AppShellModule;

const HospitalManager =
  (HospitalManagerModule as any).HospitalManager ||
  (HospitalManagerModule as any).default ||
  HospitalManagerModule;

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");

  let hospitals: Hospital[] = [];
  let errorMsg: string | null = null;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_list_hospitals");

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      hospitals = rpcData as Hospital[];
    } else {
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
    errorMsg = err instanceof Error ? err.message : "Error fetching hospitals list";
  }

  const safeHospitals = (hospitals || []).filter(
    (h) => h && typeof h === "object" && h.id,
  );

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Manage hospitals</h1>
        <p className="text-xs text-[var(--muted)]">
          Full catalog of hospital sites, intake phones, and available emergency bed capacity.
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