import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { Building2, ShieldAlert, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalPage({
  searchParams,
}: {
  searchParams?: Promise<{ facilityId?: string }> | { facilityId?: string };
}) {
  // Allow verified hospital staff as well as admin/dispatcher supervisors
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  const resolvedParams = searchParams ? await searchParams : {};
  const isSupervisor = profile.role === "admin" || profile.role === "dispatcher";

  // Strict role isolation:
  // - Hospital clinical staff are ALWAYS bound to their accredited profile.hospital_id (cannot inspect others)
  // - Supervisors (Admin/Dispatcher) can inspect any facility via ?facilityId=... in Read-Only Monitor Mode
  let hospitalId: string | null = null;
  let readOnly = false;

  if (isSupervisor) {
    readOnly = true;
    hospitalId = resolvedParams.facilityId || profile.hospital_id || null;
    if (!hospitalId) {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id")
        .limit(1)
        .maybeSingle();
      hospitalId = firstHosp?.id || null;
    }
  } else {
    // Hospital role
    hospitalId = profile.hospital_id || null;
    readOnly = false;
  }

  if (!hospitalId) {
    return (
      <AppShell profile={profile}>
        <div className="card max-w-xl mx-auto p-6 sm:p-8 text-center space-y-4 mt-8 border-2 border-amber-500/30">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto ring-1 ring-amber-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {isSupervisor ? "No Hospital Facilities Configured" : "Unassigned Hospital Facility Profile"}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {isSupervisor ? (
                "There are currently no accredited partner hospitals in the system database to monitor."
              ) : (
                <>
                  Your account (<strong className="text-[var(--foreground)]">{profile.display_name || profile.email}</strong>) is verified with the <strong>hospital</strong> clinical role, but has not yet been bound to an accredited partner facility.
                </>
              )}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Under Solace clinical governance, hospital desks cannot view intake telemetry or alter capacity until linked by the System Administrator.</span>
          </div>
          {isSupervisor && (
            <div className="pt-2">
              <Link href="/admin/hospitals" className="btn btn-primary text-xs px-4 py-2">
                Manage Hospital Facilities →
              </Link>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // Fetch the accredited hospital
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
      {isSupervisor && (
        <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Supervisor Desk Monitor (Read-Only)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  AUDIT MODE
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Inspecting incoming ambulance queue &amp; capacity for <strong className="text-[var(--foreground)]">{currentHospital?.name || "Facility"}</strong>. Bed alterations, admissions, and shift verifications are locked to hospital staff.
              </p>
            </div>
          </div>
          <Link
            href="/admin/hospitals"
            className="btn btn-ghost text-xs px-3 py-1.5 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-300 dark:border-blue-800 shrink-0 self-start sm:self-center"
          >
            ← Back to Facilities
          </Link>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-xl font-bold">
          {currentHospital?.name ? `${currentHospital.name} — ` : ""}ER Intake &amp; Triage Desk
        </h1>
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
          readOnly={readOnly}
        />
        <HospitalCards
          requests={requests}
          rules={rules}
          availableCapacity={capacity}
          readOnly={readOnly}
        />
      </div>
    </AppShell>
  );
}
