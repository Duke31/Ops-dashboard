import { AppShell } from "@/components/AppShell";
import { HospitalAuditHistoryView } from "@/components/hospital/HospitalAuditHistoryView";
import { requireProfile } from "@/lib/auth";
import { fetchHospitalHistory } from "@/lib/queries";
import type { EmergencyRequest } from "@/lib/types";
import { Building2, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalHistoryPage() {
  // Strict role isolation: Only verified hospital staff can view facility audit history
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
            <span>Facility handover archives are strictly protected under clinical privacy governance and require facility assignment.</span>
          </div>
        </div>
      </AppShell>
    );
  }

  let hospitalName: string | null = null;
  try {
    const { data } = await supabase
      .from("hospitals")
      .select("name")
      .eq("id", hospitalId)
      .maybeSingle();
    hospitalName = data?.name ?? null;
  } catch (e) {
    console.error("Error fetching hospital name:", e);
  }

  let requests: EmergencyRequest[] = [];
  try {
    requests = await fetchHospitalHistory(supabase, hospitalId, 150);
  } catch (e) {
    console.error("Error fetching hospital history:", e);
    requests = [];
  }

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏥</span>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                Hospital Clinical &amp; Emergency Audit Log
              </h1>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Official institutional record of all patient transfers, bed admissions, clinical handovers, and closed emergency tickets for{" "}
              <strong className="text-[var(--foreground)]">
                {hospitalName || "your assigned facility"}
              </strong>
              .
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span>📋</span>
            <span>Accredited Clinical Audit Archive</span>
          </span>
        </div>
      </div>

      <HospitalAuditHistoryView
        requests={requests}
        hospitalName={hospitalName}
      />
    </AppShell>
  );
}
