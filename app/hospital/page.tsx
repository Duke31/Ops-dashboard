import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, Hospital, TransitionRule } from "@/lib/types";
import Link from "next/link";

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: Promise<{ hospital_id?: string }>;
}) {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);
  const params = await searchParams;

  // Fetch all hospitals for switcher dropdown (helpful for admin/dispatcher oversight)
  const { data: allHospitals } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity, intake_phone")
    .order("name");

  const hospitalList = (allHospitals ?? []) as Hospital[];

  // Determine active hospital:
  // If staff has fixed hospital_id, use that.
  // Otherwise check URL search param `hospital_id`, or fallback to first hospital in database.
  let hospitalId = profile.hospital_id;
  if (!hospitalId) {
    if (params.hospital_id && hospitalList.some((h) => h.id === params.hospital_id)) {
      hospitalId = params.hospital_id;
    } else if (hospitalList.length > 0) {
      hospitalId = hospitalList[0].id;
    }
  }

  const activeHospital = hospitalList.find((h) => h.id === hospitalId);
  const capacity = activeHospital?.available_capacity ?? null;

  let requests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

  if (hospitalId) {
    try {
      requests = await fetchRequests(supabase, { hospitalId, activeOnly: true });
    } catch (e) {
      console.error("Error fetching requests:", e);
      requests = [];
    }
    try {
      rules = await fetchTransitionRules(supabase, "hospital");
    } catch {
      rules = [];
    }
  }

  return (
    <AppShell profile={profile}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ER Intake & Triage Desk</h1>
          <p className="text-xs text-[var(--muted)]">
            Incoming ambulance dispatches, clinical triage handovers, and live bed admissions.
          </p>
        </div>

        {/* Facility Selector for Admins / Multi-Site Supervisors */}
        {profile.role !== "hospital" && hospitalList.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)] font-medium">Viewing Facility:</span>
            <div className="flex flex-wrap gap-1.5">
              {hospitalList.map((h) => {
                const isSelected = h.id === hospitalId;
                return (
                  <Link
                    key={h.id}
                    href={`/hospital?hospital_id=${h.id}`}
                    className={`px-2.5 py-1 text-xs rounded font-medium border transition-colors ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                        : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border,#e2e8f0)] hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {h.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hospitalId ? (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Active Facility Header banner */}
          <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🏥</span>
              <span>
                Active Intake Station: <strong>{activeHospital?.name}</strong>
                {activeHospital?.intake_phone ? ` (ER Line: ${activeHospital.intake_phone})` : ""}
              </span>
            </div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-300">
              ● Live Intake Ready
            </div>
          </div>

          <HospitalCapacity hospitalId={hospitalId} value={capacity} />

          <HospitalCards
            requests={requests}
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