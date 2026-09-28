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
  let hospitalName = "Assigned Emergency Centre";
  let intakePhone: string | null = null;
  let requests: EmergencyRequest[] = [];
  let admittedRequests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

  // If user is admin/dispatcher without a specific hospital, use first one
  if (!hospitalId) {
    try {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id, name, available_capacity, intake_phone")
        .limit(1)
        .maybeSingle();

      if (firstHosp) {
        hospitalId = firstHosp.id;
        hospitalName = firstHosp.name;
        capacity = firstHosp.available_capacity ?? null;
        intakePhone = firstHosp.intake_phone ?? null;
      }
    } catch (e) {
      console.error("Error fetching fallback hospital:", e);
    }
  } else {
    try {
      const { data: hosp } = await supabase
        .from("hospitals")
        .select("name, available_capacity, intake_phone")
        .eq("id", hospitalId)
        .maybeSingle();

      if (hosp) {
        hospitalName = hosp.name;
        capacity = hosp.available_capacity ?? null;
        intakePhone = hosp.intake_phone ?? null;
      }
    } catch (e) {
      console.error("Error fetching hospital capacity:", e);
    }
  }

  if (hospitalId) {
    try {
      // 1. Fetch active inbound requests
      requests = await fetchRequests(supabase, { hospitalId, activeOnly: true });
    } catch (e) {
      console.error("Error fetching active requests:", e);
      requests = [];
    }

    try {
      // 2. Fetch admitted patient records
      admittedRequests = await fetchRequests(supabase, {
        hospitalId,
        completedOnly: true,
        limit: 25,
      });
    } catch (e) {
      console.error("Error fetching admitted requests:", e);
      admittedRequests = [];
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
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Active Facility Header banner */}
          <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🏥</span>
              <span>
                Facility: <strong>{hospitalName}</strong>
                {intakePhone ? ` · ER Phone: ${intakePhone}` : ""}
              </span>
            </div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-300">
              ● Live Intake Station Active
            </div>
          </div>

          <HospitalCapacity hospitalId={hospitalId} value={capacity} />

          <HospitalCards
            requests={requests}
            admittedRequests={admittedRequests}
            rules={rules}
            hospitalId={hospitalId}
            currentCapacity={capacity}
          />
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-[#b42318] space-y-2">
          <p className="font-semibold">No hospital facility found in network.</p>
          <p className="text-xs text-[var(--muted)]">
            Please register a hospital in the Admin panel to begin accepting incoming ambulances.
          </p>
        </div>
      )}
    </AppShell>
  );
}