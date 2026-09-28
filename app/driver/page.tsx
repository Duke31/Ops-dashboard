import { AppShell } from "@/components/AppShell";
import { DriverConsole } from "@/components/DriverConsole";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Driver, EmergencyRequest } from "@/lib/types";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile(["driver", "admin", "dispatcher"]);

  const isDriverRole = profile.role === "driver";
  let myDriverRecord: Driver | null = null;
  let requests: EmergencyRequest[] = [];

  if (isDriverRole) {
    // STRICT: Fetch the driver record linked to this logged-in auth user
    const { data: dRow } = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    myDriverRecord = (dRow ?? null) as Driver | null;

    if (myDriverRecord?.id) {
      // STRICT FILTER: Only load emergency requests assigned to THIS driver!
      requests = await fetchRequests(supabase, {
        driverId: myDriverRecord.id,
        activeOnly: true,
      });
    } else {
      requests = [];
    }
  } else {
    // Admin / Dispatcher mode: can view active requests
    requests = await fetchRequests(supabase, { activeOnly: true });
  }

  const [rules, driversRes] = await Promise.all([
    fetchTransitionRules(supabase, "driver").catch(() => []),
    supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .order("display_name"),
  ]);

  const drivers = (driversRes.data ?? []) as Driver[];

  return (
    <AppShell profile={profile}>
      <div className="mb-4 max-w-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Ambulance Responder Console</h1>
            <p className="text-xs text-[var(--muted)]">
              Real-time dispatches, turn-by-turn navigation, and patient triage details.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span>●</span>
            <span>Live Dispatch Active</span>
          </span>
        </div>
      </div>

      <DriverConsole
        drivers={drivers}
        requests={requests}
        rules={rules}
        initialDriverId={myDriverRecord?.id || null}
        isDriverRole={isDriverRole}
        activeDriverRecord={myDriverRecord}
      />
    </AppShell>
  );
}