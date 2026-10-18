import { AppShell } from "@/components/AppShell";
import { HospitalAuditHistoryView } from "@/components/hospital/HospitalAuditHistoryView";
import { requireProfile } from "@/lib/auth";
import { fetchHospitalHistory } from "@/lib/queries";
import type { EmergencyRequest, Hospital } from "@/lib/types";
import { Building2, ShieldAlert, FileText, ChevronDown } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ facilityId?: string }> | { facilityId?: string };
}) {
  // Allow verified hospital staff as well as admin and dispatcher supervisors
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  const resolvedParams = searchParams ? await searchParams : {};
  const isSupervisor = profile.role === "admin" || profile.role === "dispatcher";

  let hospitalId: string | null = null;
  let allHospitals: Hospital[] = [];

  if (isSupervisor) {
    // Supervisors can inspect any facility via ?facilityId=...
    const { data: hospList } = await supabase
      .from("hospitals")
      .select("id, name, available_capacity, address")
      .order("name", { ascending: true });
    
    allHospitals = (hospList || []) as Hospital[];
    hospitalId = resolvedParams.facilityId || profile.hospital_id || allHospitals[0]?.id || null;
  } else {
    hospitalId = profile.hospital_id || null;
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
              {isSupervisor ? "No Partner Hospitals Configured" : "Unassigned Hospital Facility Profile"}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {isSupervisor
                ? "There are currently no accredited partner hospitals in the system database to audit."
                : `Your account (${profile.display_name || profile.email}) is verified with the hospital clinical role, but has not yet been bound to an accredited partner facility.`}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Facility handover archives are strictly protected under clinical privacy governance.</span>
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
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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

          <div className="flex items-center gap-2 flex-wrap">
            {isSupervisor && allHospitals.length > 1 && (
              <div className="flex items-center gap-2 bg-[var(--surface-raised)] p-1.5 rounded-xl border border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--muted)] pl-2">Facility:</span>
                <div className="flex flex-wrap gap-1">
                  {allHospitals.map((h) => {
                    const isSelected = h.id === hospitalId;
                    return (
                      <Link
                        key={h.id}
                        href={`/hospital/history?facilityId=${h.id}`}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/40"
                        }`}
                      >
                        {h.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <FileText className="w-3.5 h-3.5" />
              <span>Accredited Clinical Audit Archive</span>
            </span>
          </div>
        </div>
      </div>

      <HospitalAuditHistoryView
        requests={requests}
        hospitalName={hospitalName}
      />
    </AppShell>
  );
}
