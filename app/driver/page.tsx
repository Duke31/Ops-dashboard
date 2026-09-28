import { AppShell } from "@/components/AppShell";
import { DriverConsole } from "@/components/DriverConsole";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Driver, EmergencyRequest } from "@/lib/types";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile([
    "driver",
    "admin",
    "dispatcher",
  ]);

  const isDriverRole = profile.role === "driver";
  let myDriverRecord: Driver | null = null;
  let linkError: string | null = null;
  let requests: EmergencyRequest[] = [];
  let drivers: Driver[] = [];

  if (isDriverRole) {
    const { data: dRow, error: dErr } = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (dErr) linkError = dErr.message;
    myDriverRecord = (dRow ?? null) as Driver | null;

    if (myDriverRecord?.id) {
      // Prefer RPC that hard-scopes by auth.uid() → drivers.id
      const { data: rpcRows, error: rpcErr } = await supabase.rpc(
        "driver_my_active_requests",
      );

      if (!rpcErr && Array.isArray(rpcRows)) {
        requests = (rpcRows as EmergencyRequest[]).filter(
          (r) => r.driver_id === myDriverRecord!.id,
        );
      } else {
        // Fallback query still scoped + filtered
        try {
          const rows = await fetchRequests(supabase, {
            driverId: myDriverRecord.id,
            activeOnly: true,
          });
          requests = rows.filter((r) => r.driver_id === myDriverRecord!.id);
        } catch (e) {
          linkError =
            (rpcErr?.message ||
              (e instanceof Error ? e.message : "Failed to load jobs")) +
            (rpcErr
              ? " — run driver_my_active_requests SQL if missing."
              : "");
          requests = [];
        }
      }

      // Enrich hospital/driver embeds when RPC returns bare rows
      if (requests.length > 0) {
        try {
          const ids = requests.map((r) => r.id);
          const rich = await fetchRequests(supabase, {
            driverId: myDriverRecord.id,
            activeOnly: true,
          });
          const byId = new Map(rich.map((r) => [r.id, r]));
          requests = requests
            .map((r) => byId.get(r.id) || r)
            .filter((r) => r.driver_id === myDriverRecord!.id);
          // If rich fetch returned extras, still only keep our ids
          requests = requests.filter((r) => ids.includes(r.id) || r.driver_id === myDriverRecord!.id);
          requests = requests.filter((r) => r.driver_id === myDriverRecord!.id);
        } catch {
          // keep bare rpc rows
        }
      }

      drivers = [myDriverRecord];
    } else {
      requests = [];
      drivers = [];
      linkError =
        linkError ||
        "No drivers row linked to this login (drivers.user_id must equal your auth user id).";
    }
  } else {
    try {
      requests = await fetchRequests(supabase, { activeOnly: true });
    } catch {
      requests = [];
    }
    const { data: allDrivers } = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .order("display_name");
    drivers = (allDrivers ?? []) as Driver[];
  }

  const rules = await fetchTransitionRules(supabase, "driver").catch(() => []);

  return (
    <AppShell profile={profile}>
      <div className="mb-4 max-w-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Ambulance Responder Console</h1>
            <p className="text-xs text-[var(--muted)]">
              Only jobs assigned to your unit. Patient location is hidden from
              other responders.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span>●</span>
            <span>Live Dispatch Active</span>
          </span>
        </div>
        {isDriverRole && (
          <p className="mt-2 text-[11px] text-[var(--muted)] font-mono">
            Scope:{" "}
            {myDriverRecord?.id
              ? `unit ${myDriverRecord.id.slice(0, 8)}… (${myDriverRecord.display_name || "unit"})`
              : "no unit linked"}
            {" · "}
            {requests.length} job(s)
          </p>
        )}
        {isDriverRole && linkError && (
          <p className="mt-2 text-sm text-[#b42318]">{linkError}</p>
        )}
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
