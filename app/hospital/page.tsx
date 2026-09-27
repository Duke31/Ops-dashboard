import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Hospital } from "@/lib/types";

export default async function HospitalPage() {
  const { supabase, profile } = await requireProfile([
    "hospital",
    "admin",
    "dispatcher",
  ]);

  // Fetch all hospitals
  const { data: hospitalsData } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity")
    .order("name");

  const hospitals = (hospitalsData ?? []) as Hospital[];

  // Use the profile's hospital_id, or default to the first hospital in the list
  const activeHospital =
    hospitals.find((h) => h.id === profile.hospital_id) || hospitals[0] || null;

  const hospitalId = activeHospital?.id ?? null;
  const capacity = activeHospital?.available_capacity ?? null;

  const [requests, rules] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }).catch(() => []),
    fetchTransitionRules(supabase, "hospital").catch(() => []),
  ]);

  // Filter requests destined for this hospital (or all active if none specified)
  const scopedRequests = hospitalId
    ? requests.filter((r) => !r.hospital_id || r.hospital_id === hospitalId)
    : requests;

  return (
    <AppShell profile={profile}>
      <div className="mb-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">ER Intake & Triage Desk</h1>
            <p className="text-xs text-[var(--muted)]">
              {activeHospital
                ? `Active Facility: ${activeHospital.name}`
                : "Incoming ambulance dispatches and bed admissions"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span>●</span>
            <span>Live ER Desk</span>
          </span>
        </div>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {hospitalId && (
          <HospitalCapacity hospitalId={hospitalId} value={capacity} />
        )}
        <HospitalCards requests={scopedRequests} rules={rules} />
      </div>
    </AppShell>
  );
}