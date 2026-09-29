import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { TelemetryFleetBanner } from "@/components/TelemetryFleetBanner";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import { fetchDriversForDesk } from "@/lib/drivers";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DispatcherPage() {
  const { supabase, profile } = await requireProfile("dispatcher");

  let requests: EmergencyRequest[] = [];
  let rules: TransitionRule[] = [];
  let loadError: string | null = null;
  let hospitals: { id: string; name: string; available_capacity?: number | null }[] = [];

  try {
    const [reqResult, rulesResult, hospitalsRes, driversPack] =
      await Promise.all([
        fetchRequests(supabase, { activeOnly: true })
          .then((r) => ({ ok: true as const, data: r }))
          .catch((e: unknown) => ({
            ok: false as const,
            error: e instanceof Error ? e.message : String(e),
          })),
        fetchTransitionRules(supabase, "dispatcher").catch(
          () => [] as TransitionRule[],
        ),
        supabase
          .from("hospitals")
          .select("id, name, available_capacity")
          .order("name"),
        fetchDriversForDesk(supabase),
      ]);

    if (reqResult.ok) {
      requests = reqResult.data;
    } else {
      loadError = reqResult.error;
    }
    rules = rulesResult;
    hospitals = hospitalsRes.data ?? [];
    if (hospitalsRes.error && !loadError) {
      loadError = `hospitals SELECT: ${hospitalsRes.error.message}`;
    }

    return (
      <AppShell profile={profile}>
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-semibold">Active emergency requests</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span>🟢</span>
              <span>Live Network • Oyo Dispatch</span>
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Status buttons come from emergency_transition_rules — the frontend
            does not hardcode the state machine.
          </p>
        </div>
        {loadError && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            <strong>Load error (not loosening RLS):</strong> {loadError}
          </div>
        )}
        {driversPack.error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            <strong>Driver list error (not loosening RLS):</strong>{" "}
            {driversPack.error}
          </div>
        )}
        {driversPack.drivers.length === 0 && !driversPack.error && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            No drivers rows returned. Confirm staff accounts exist in the{" "}
            <code>drivers</code> table.
          </div>
        )}
        <LogEmergencyForm />
        <TelemetryFleetBanner
          drivers={driversPack.drivers}
          requests={requests}
        />
        <RequestBoard
          requests={requests}
          rules={rules}
          actorRole="dispatcher"
          hospitals={hospitals}
          drivers={driversPack.drivers}
        />
      </AppShell>
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <AppShell profile={profile}>
        <div className="rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-3 text-sm text-red-800 dark:text-red-200">
          <strong>Dispatcher page error (not loosening RLS):</strong> {msg}
        </div>
      </AppShell>
    );
  }
}
