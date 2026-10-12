import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalPage({
  searchParams,
}: {
  searchParams?: Promise<{ facilityId?: string }>;
}) {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  const resolvedParams = searchParams ? await searchParams : {};
  // Allow admins and dispatchers to audit any facility via ?facilityId=<uuid>
  let hospitalId = resolvedParams.facilityId || profile.hospital_id;
  let facilityName = "Hospital Facility";
  let capacity: number | null = null;
  let requests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];

  if (!hospitalId) {
    try {
      const { data: firstHosp } = await supabase
        .from("hospitals")
        .select("id, name, available_capacity")
        .limit(1)
        .maybeSingle();

      if (firstHosp) {
        hospitalId = firstHosp.id;
        facilityName = firstHosp.name;
        capacity = firstHosp.available_capacity ?? null;
      }
    } catch (e) {
      console.error("Error fetching fallback hospital:", e);
    }
  } else {
    try {
      const { data } = await supabase
        .from("hospitals")
        .select("name, available_capacity")
        .eq("id", hospitalId)
        .maybeSingle();
      facilityName = data?.name || "Hospital Facility";
      capacity = data?.available_capacity ?? null;
    } catch (e) {
      console.error("Error fetching hospital capacity:", e);
    }
  }

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{facilityName} — ER Intake Desk</h1>
            {resolvedParams.facilityId && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ADMIN AUDIT VIEW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Incoming ambulance dispatches, clinical SBAR triage handovers, and live bed admissions.
          </p>
        </div>

        {resolvedParams.facilityId && (
          <a
            href="/admin/hospitals"
            className="text-xs text-slate-400 hover:text-white underline"
          >
            ← Return to Hospital Directory
          </a>
        )}
      </div>

      {hospitalId ? (
        <div className="space-y-4 max-w-4xl mx-auto">
          <HospitalCapacity hospitalId={hospitalId} value={capacity} />
          <HospitalCards requests={requests} rules={rules} availableCapacity={capacity} />
        </div>
      ) : (
        <div className="card p-6 text-sm text-[#b42318] text-center">
          No hospital facility found in database. Please create a hospital in the Admin panel.
        </div>
      )}
    </AppShell>
  );
}
