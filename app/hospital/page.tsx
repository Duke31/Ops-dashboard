import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";

export default async function HospitalPage() {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  let hospitalId = profile.hospital_id;
  let capacity: number | null = null;
  let incomingRequests: EmergencyRequest[] = [];
  let historyRequests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

  // Fallback if admin/dispatcher doesn't have a specific hospital assigned
  if (!hospitalId) {
    try {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id, available_capacity")
        .limit(1)
        .maybeSingle();
      if (firstHosp) {
        hospitalId = firstHosp.id;
        capacity = firstHosp.available_capacity ?? null;
      }
    } catch (e) {
      console.error("Error fetching fallback hospital:", e);
    }
  } else {
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
  }

  if (hospitalId) {
    try {
      // Fetch incoming active requests
      incomingRequests = await fetchRequests(supabase, { hospitalId, activeOnly: true });
    } catch (e) {
      console.error("Error fetching active requests:", e);
      incomingRequests = [];
    }

    try {
      // Fetch completed admission records (History)
      const allHospitalRequests = await fetchRequests(supabase, { hospitalId, activeOnly: false });
      historyRequests = allHospitalRequests.filter((r) => r.status === "Completed");
    } catch (e) {
      console.error("Error fetching completed requests:", e);
      historyRequests = [];
    }

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
          Incoming ambulance dispatches, clinical triage handovers, and live bed admissions.
        </p>
      </div>

      {hospitalId ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Live Capacity Slider & Counter */}
          <HospitalCapacity hospitalId={hospitalId} value={capacity} />

          {/* Incoming Dispatches + Modal + Handover Log */}
          <HospitalCards
            requests={incomingRequests}
            historyRequests={historyRequests}
            rules={rules}
            availableCapacity={capacity}
          />
        </div>
      ) : (
        <div className="card p-6 text-sm text-[#b42318] text-center">
          No hospital facility found in database. Please create a hospital in the Admin panel.
        </div>
      )}
    </AppShell>
  );
}