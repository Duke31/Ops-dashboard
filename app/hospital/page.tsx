import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { Building2, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalPage() {
  // Strict role isolation: Only authorized hospital staff can access ER Intake Desk
  const { supabase, profile } = await requireProfile("hospital");

  const hospitalId = profile.hospital_id;

  if (!hospitalId) {
    return (
      <AppShell profile={profile}>
        <div className="card max-w-xl mx-auto p-6 sm:p-8 text-center space-y-4 mt-8 border-2 border-amber-500/30">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto ring-1 ring-amber-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Unassigned Hospital Facility Profile</h1>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              Your account (<strong className="text-[var(--foreground)]">{profile.display_name || profile.email}</strong>) is verified with the <strong>hospital</strong> clinical role, but has not yet been bound to an accredited partner facility.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Under Solace clinical governance, hospital desks cannot view intake telemetry or alter capacity until linked by the System Administrator.</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Fetch the accredited hospital linked to this authenticated profile
  const { data: currentHospital } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity")
    .eq("id", hospitalId)
    .maybeSingle();

  const capacity = currentHospital?.available_capacity ?? null;

  let requests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

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

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">ER Intake &amp; Triage Desk</h1>
        <p className="text-xs text-[var(--muted)]">
          {currentHospital?.name ? (
            <span>
              Facility: <strong className="text-[var(--foreground)]">{currentHospital.name}</strong> ·{" "}
            </span>
          ) : null}
          Incoming ambulance dispatches, pre-arrival SBAR clinical handovers, and live bed admissions.
        </p>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        <HospitalCapacity
          hospitalId={hospitalId}
          value={capacity}
          hospitalName={currentHospital?.name}
        />
        <HospitalCards
          requests={requests}
          rules={rules}
          availableCapacity={capacity}
        />
      </div>
    </AppShell>
  );
}
