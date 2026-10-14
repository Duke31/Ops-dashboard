import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { EmergencyRequest, TransitionRule, Hospital } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalPage({
  searchParams,
}: {
  searchParams?: Promise<{ facilityId?: string }>;
}) {
  const { supabase, profile } = await requireProfile(["hospital", "admin", "dispatcher"]);
  const params = searchParams ? await searchParams : {};

  // Fetch all hospitals for facility switcher
  const { data: allHospitals } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity")
    .order("name");

  let hospitalId = profile.hospital_id;

  // If admin/dispatcher or override requested via query param
  if (params.facilityId && (profile.role === "admin" || profile.role === "dispatcher")) {
    hospitalId = params.facilityId;
  } else if (!hospitalId && allHospitals && allHospitals.length > 0) {
    hospitalId = allHospitals[0].id;
  }

  const currentHospital = (allHospitals || []).find((h) => h.id === hospitalId);
  const capacity = currentHospital?.available_capacity ?? null;

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
            Incoming ambulance dispatches, pre-arrival SBAR clinical handovers, and live bed admissions.
          </p>
        </div>

        {/* Facility Switcher for Admins/Dispatchers */}
        {(profile.role === "admin" || profile.role === "dispatcher") && allHospitals && allHospitals.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[var(--muted)]">Switch Facility:</span>
            <div className="flex flex-wrap gap-1">
              {allHospitals.slice(0, 4).map((h) => (
                <Link
                  key={h.id}
                  href={`/hospital?facilityId=${h.id}`}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                    h.id === hospitalId
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {h.name.split(" ")[0]} ({h.available_capacity ?? 0}b)
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {hospitalId ? (
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
      ) : (
        <div className="card p-6 text-sm text-[#b42318] text-center">
          No hospital facility found in database. Please create a hospital in the Admin panel.
        </div>
      )}
    </AppShell>
  );
}
