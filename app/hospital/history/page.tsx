import { AppShell } from "@/components/AppShell";
import { AdminHistoryView } from "@/components/AdminHistoryView";
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
    requests = await fetchHospitalHistory(supabase, hospitalId, 100);
  }

  return (
    <AppShell profile={profile}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              Hospital Emergency History & Admissions
            </h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              Closed cases, completed admissions, and transfers assigned to{" "}
              <strong className="text-[var(--foreground)]">
                {hospitalName || "your hospital facility"}
              </strong>
              .
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span>🏥</span>
            <span>Facility Archive</span>
          </span>
        </div>
      </div>

      <AdminHistoryView
        requests={requests}
        scopeRole="hospital"
        emptyMessage="No closed cases for this hospital yet"
      />
    </AppShell>
  );
}
