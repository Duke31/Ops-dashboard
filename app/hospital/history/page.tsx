import { AppShell } from "@/components/AppShell";
import { HospitalAuditHistoryView } from "@/components/hospital/HospitalAuditHistoryView";
import { requireProfile } from "@/lib/auth";
import { fetchHospitalHistory } from "@/lib/queries";
import type { EmergencyRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalHistoryPage() {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  let hospitalId = profile.hospital_id;
  let hospitalName: string | null = null;

  // If user is admin/dispatcher without a hospital_id in profile, fallback to first hospital
  if (!hospitalId) {
    try {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id, name")
        .limit(1)
        .maybeSingle();

      if (firstHosp) {
        hospitalId = firstHosp.id;
        hospitalName = firstHosp.name;
      }
    } catch (e) {
      console.error("Error fetching fallback hospital:", e);
    }
  } else {
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
  }

  let requests: EmergencyRequest[] = [];
  if (hospitalId) {
    requests = await fetchHospitalHistory(supabase, hospitalId, 150);
  }

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏥</span>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                Hospital Clinical & Emergency Audit Log
              </h1>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Official institutional record of all patient transfers, bed admissions, clinical handovers, and closed emergency tickets for{" "}
              <strong className="text-[var(--foreground)]">
                {hospitalName || "your hospital facility"}
              </strong>
              .
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span>🔒</span>
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
