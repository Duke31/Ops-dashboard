import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Hospital } from "@/lib/types";

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: Promise<{ hospital_id?: string }>;
}) {
  const { supabase, profile } = await requireProfile(["hospital", "admin"]);
  const params = await searchParams;

  // Fetch all hospitals so admins can switch views
  const { data: allHospitals } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity")
    .order("name");

  const hospitalsList = (allHospitals ?? []) as Hospital[];

  // Determine active hospital
  const activeHospitalId =
    profile.role === "admin" && params.hospital_id
      ? params.hospital_id
      : profile.hospital_id || hospitalsList[0]?.id || null;

  let capacity: number | null = null;
  let activeHospitalName = "Hospital ER Intake Desk";

  if (activeHospitalId) {
    const activeHosp = hospitalsList.find((h) => h.id === activeHospitalId);
    if (activeHosp) {
      capacity = activeHosp.available_capacity ?? null;
      activeHospitalName = activeHosp.name;
    }
  }

  const [requests, rules] = await Promise.all([
    activeHospitalId
      ? fetchRequests(supabase, { hospitalId: activeHospitalId, activeOnly: true })
      : Promise.resolve([]),
    fetchTransitionRules(supabase, "hospital").catch(() => []),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ER Intake & Triage Desk</h1>
          <p className="text-xs text-[var(--muted)]">
            Incoming ambulance dispatches, clinical triage handovers, and live bed admissions.
          </p>
        </div>

        {/* Admin Hospital Switcher */}
        {profile.role === "admin" && hospitalsList.length > 0 && (
          <form method="get" className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)] font-medium">Switch Facility:</span>
            <select
              name="hospital_id"
              defaultValue={activeHospitalId || ""}
              // @ts-expect-error form submission on change
              onChange={(e) => e.target.form?.submit()}
              className="select text-xs py-1 px-2.5 bg-[var(--surface)] border border-[var(--border,#e2e8f0)] rounded-md font-semibold"
            >
              {hospitalsList.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>

      {activeHospitalId ? (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Live Bed Capacity Card */}
          <HospitalCapacity hospitalId={activeHospitalId} value={capacity} />

          {/* Incoming & Arrived Patients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                Ambulances & Incoming Patients ({requests.length})
              </h2>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span>●</span> Live ER Channel
              </span>
            </div>

            <HospitalCards
              requests={requests}
              rules={rules}
              hospitalId={activeHospitalId}
              profileRole={profile.role}
            />
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center text-sm text-[#b42318]">
          This account has no hospital facility attached. Select a hospital or ask an administrator to assign one.
        </div>
      )}
    </AppShell>
  );
}