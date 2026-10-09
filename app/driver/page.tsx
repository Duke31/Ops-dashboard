import { AppShell } from "@/components/AppShell";
import { DriverConsole } from "@/components/DriverConsole";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Driver } from "@/lib/types";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile(["driver", "admin", "dispatcher"]);
  const isDriverRole = profile.role === "driver";

  // Try selecting all telemetry columns; fallback to basic set if migration not applied
  let driversRes = await supabase
    .from("drivers")
    .select("id, display_name, vehicle_label, hospital_id, active, user_id, current_lat, current_lng, last_location_at, battery_level, is_charging, network_type")
    .order("display_name");

  if (driversRes.error) {
    driversRes = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .order("display_name");
  }

  const [requests, rules] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "driver").catch(() => []),
  ]);

  const drivers = (driversRes.data ?? []) as Driver[];

  let activeDriverRecord: Driver | null = null;
  if (isDriverRole) {
    activeDriverRecord =
      drivers.find((d) => d.user_id === profile.user_id) ||
      drivers.find(
        (d) =>
          d.display_name &&
          profile.display_name &&
          d.display_name.trim().toLowerCase() === profile.display_name.trim().toLowerCase(),
      ) ||
      null;
  }

  return (
    <AppShell profile={profile} driverUnitId={isDriverRole ? activeDriverRecord?.id ?? null : null}>
      <div className="mb-4 max-w-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">
              {isDriverRole ? "Ambulance Responder Console" : "Fleet Monitor (Desk)"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {isDriverRole
                ? "Real-time dispatches, turn-by-turn navigation, and patient triage details."
                : "Select any unit to follow live GPS from the driver device; browser location is never published as an ambulance."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isDriverRole
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
            }`}
          >
            <span>●</span>
            <span>{isDriverRole ? "Live unit GPS enabled" : "Desk track read-only"}</span>
          </span>
        </div>
      </div>

      <DriverConsole
        drivers={drivers}
        requests={requests}
        rules={rules}
        initialDriverId={isDriverRole ? activeDriverRecord?.id ?? null : null}
        isDriverRole={isDriverRole}
        activeDriverRecord={activeDriverRecord}
      />
    </AppShell>
  );
}
