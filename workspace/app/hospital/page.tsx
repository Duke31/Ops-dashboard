import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, Hospital, TransitionRule } from "@/lib/types";

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: Promise<{ hospital_id?: string }>;
}) {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);
  const params = await searchParams;

  // Determine active hospital
  let hospitalId = profile.hospital_id;

  // If user is admin/dispatcher without a fixed hospital_id, allow switching or fallback
  let activeHospital: Hospital | null = null;
  if (!hospitalId) {
    const { data: allHospitals } = await supabase
      .from("hospitals")
      .select("id, name, address, available_capacity, intake_phone")
      .order("name");

    const hospitalList = (allHospitals ?? []) as Hospital[];
    if (params.hospital_id && hospitalList.some((h) => h.id === params.hospital_id)) {
      hospitalId = params.hospital_id;
    } else if (hospitalList.length > 0) {
      hospitalId = hospitalList[0].id;
    }
    activeHospital = hospitalList.find((h) => h.id === hospitalId) || null;
  } else {
    const { data: myHosp } = await supabase
      .from("hospitals")
      .select("id, name, address, available_capacity, intake_phone")
      .eq("id", hospitalId)
      .maybeSingle();
    activeHospital = (myHosp as Hospital) || null;
  }

  const capacity = activeHospital?.available_capacity ?? null;

  let inboundRequests: EmergencyRequest[] = [];
  let admittedRequests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

  if (hospitalId) {
    try {
      [inboundRequests, admittedRequests, rules] = await Promise.all([
        fetchRequests(supabase, { hospitalId, activeOnly: true }),
        fetchRequests(supabase, { hospitalId, completedOnly: true, limit: 25 }),
        fetchTransitionRules(supabase, "hospital").catch(() => []),
      ]);
    } catch (e) {
      console.error("Error loading hospital intake data:", e);
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
                Active Intake Station: <strong>{activeHospital?.name || "Hospital Facility"}</strong>
                {activeHospital?.intake_phone ? ` (ER Line: ${activeHospital.intake_phone})` : ""}
              </span>
            </div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-300">
              ● Live Intake Ready
            </div>
          </div>

          <HospitalCapacity hospitalId={hospitalId} value={capacity} />

          <HospitalCards
            requests={inboundRequests}
            admittedRequests={admittedRequests}
            rules={rules}
            hospitalId={hospitalId}
            currentCapacity={capacity}
          />
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-[#b42318] space-y-2">
          <p className="font-semibold">No hospital facility assigned to this account.</p>
          <p className="text-xs text-[var(--muted)]">
            Please ask an administrator to link your profile to a hospital facility.
          </p>
        </div>
      )}
    </AppShell>
  );
}
