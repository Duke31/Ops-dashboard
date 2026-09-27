import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";

export default async function HospitalPage() {
  const { supabase, profile } = await requireProfile("hospital");

  let hospitalId = profile.hospital_id;
  let capacity: number | null = null;
  let requests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];
  let fetchError: string | null = null;

  // 1. If admin has no hospital attached, safely grab the first hospital
  if (!hospitalId && profile.role === "admin") {
    try {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id")
        .limit(1)
        .maybeSingle();
      hospitalId = firstHosp?.id ?? null;
    } catch {
      // Ignore fallback error
    }
  }

  // 2. Fetch capacity safely
  if (hospitalId) {
    try {
      const { data } = await supabase
        .from("hospitals")
        .select("available_capacity")
        .eq("id", hospitalId)
        .maybeSingle();
      capacity = data?.available_capacity ?? null;
    } catch (e) {
      console.error("Error fetching hospital capacity:", e);
    }

    // 3. Fetch requests safely without throwing 500 error
    try {
      requests = await fetchRequests(supabase, { hospitalId, activeOnly: true });
    } catch (e: unknown) {
      console.error("Error fetching hospital requests:", e);
      fetchError = e instanceof Error ? e.message : "Failed to load requests";
    }

    // 4. Fetch transition rules safely
    try {
      rules = await fetchTransitionRules(supabase, "hospital");
    } catch {
      rules = [];
    }
  }

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">ER Intake & Triage Desk</h1>
        <p className="text-xs text-[var(--muted)]">
          Incoming ambulance dispatches, clinical triage handovers, and bed admissions.
        </p>
      </div>

      {hospitalId ? (
        <div className="space-y-4 max-w-4xl mx-auto">
          <HospitalCapacity hospitalId={hospitalId} value={capacity} />

          {fetchError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs rounded-md">
              Notice: {fetchError}
            </div>
          )}

          <HospitalCards requests={requests} rules={rules} />
        </div>
      ) : (
        <div className="card p-6 text-sm text-[#b42318] text-center">
          This account has no hospital facility attached. Please assign a hospital to this account in the Admin Staff section.
        </div>
      )}
    </AppShell>
  );
}