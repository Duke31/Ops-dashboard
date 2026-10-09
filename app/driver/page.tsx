import { AppShell } from "@/components/AppShell";
import { DriverConsole } from "@/components/DriverConsole";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Driver } from "@/lib/types";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile([
    "driver",
    "admin",
    "dispatcher",
  ]);

  const isDriverRole = profile.role === "driver";

  const fullSelect =
    "id, display_name, vehicle_label, hospital_id, active, user_id, current_lat, current_lng, last_location_at, battery_level, is_charging, network_type";
  const basicSelect = "id, display_name, vehicle_label, hospital_id, active";

  const [requests, rules, driversPrimary] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "driver").catch(() => []),
    supabase.from("drivers").select(fullSelect).order("display_name"),
  ]);

  let driversRes = driversPrimary;
  if (driversRes.error) {
    driversRes = await supabase
      .from("drivers")
      .select(basicSelect)
      .order("display_name");
  }

  const drivers = (driversRes.data ?? []) as Driver[];

  let activeDriverRecord: Driver | null = null;
  if (isDriverRole) {
    const own = await supabase
      .from("drivers")
      .select(fullSelect)
      .eq("user_id", profile.user_id)
      .maybeSingle();
    if (!own.error && own.data) {
      activeDriverRecord = own.data as Driver;
    } else {
      activeDriverRecord =
        drivers.find(
          (d) =>
            d.display_name &&
            profile.display_name &&
            d.display_name.toLowerCase() === profile.display_name.toLowerCase(),
        ) ?? null;
    }
  }

  const initialDriverId = isDriverRole ? activeDriverRecord?.id ?? null : null;

  return (
    <AppShell profile={profile}>
      <div className="mb-4 max-w-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">
              {isDriverRole
                ? "Ambulance Responder Console"
                : "Fleet Monitor (Desk)"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {isDriverRole
                ? "Live dispatches, navigation, and patient triage for your unit."
                : "Select any unit to follow live GPS from the driver device. Your browser location is never published as an ambulance."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDriverRole
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
            }`}
          >
            <span>●</span>
            <span>
              {isDriverRole
                ? "Live unit GPS enabled"
                : "Desk track read-only"}
            </span>
          </span>
        </div>
      </div>

      <DriverConsole
        drivers={drivers}
        requests={requests}
        rules={rules}
        isDriverRole={isDriverRole}
        initialDriverId={initialDriverId}
        activeDriverRecord={activeDriverRecord}
      />
    </AppShell>
  );
}
