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

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile("admin");

  let requests: EmergencyRequest[] = [];
  let loadError: string | null = null;
  let dispatcherRules: TransitionRule[] = [];
  let hospitalRules: TransitionRule[] = [];
  let adminRules: TransitionRule[] = [];
  let hospitals: { id: string; name: string; available_capacity?: number | null }[] = [];

  try {
    const [req, dRules, hRules, aRules, hospitalsRes, driversPack] =
      await Promise.all([
        fetchRequests(supabase, { activeOnly: true }).catch((e: unknown) => {
          loadError =
            e instanceof Error ? e.message : "Failed to load emergency_requests";
          return [] as EmergencyRequest[];
        }),
        fetchTransitionRules(supabase, "dispatcher").catch(() => [] as TransitionRule[]),
        fetchTransitionRules(supabase, "hospital").catch(() => [] as TransitionRule[]),
        fetchTransitionRules(supabase, "admin").catch(() => [] as TransitionRule[]),
        supabase.from("hospitals").select("id, name, available_capacity").order("name"),
        fetchDriversForDesk(supabase),
      ]);

    requests = req;
    dispatcherRules = dRules;
    hospitalRules = hRules;
    adminRules = aRules;
    hospitals = hospitalsRes.data ?? [];
    if (hospitalsRes.error && !loadError) {
      loadError = `hospitals SELECT: ${hospitalsRes.error.message}`;
    }

    return (
      <AppShell profile={profile}>
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Network queue</h1>
          <p className="text-sm text-[var(--muted)]">
            Combined live view. Transitions are sent as actor_role=admin (must
            match your profile). Buttons follow dispatcher rules.
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
          rules={[...adminRules, ...dispatcherRules, ...hospitalRules]}
          actorRole="admin"
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
          <strong>Admin page error (not loosening RLS):</strong> {msg}
        </div>
      </AppShell>
    );
  }
}
