import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { TelemetryFleetBanner } from "@/components/TelemetryFleetBanner";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import { fetchDriversForDesk } from "@/lib/drivers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile("admin");
  const [requests, dispatcherRules, hospitalRules, adminRules, hospitalsRes, driversPack] =
    await Promise.all([
      fetchRequests(supabase, { activeOnly: true }),
      fetchTransitionRules(supabase, "dispatcher"),
      fetchTransitionRules(supabase, "hospital"),
      fetchTransitionRules(supabase, "admin"),
      supabase.from("hospitals").select("id, name, available_capacity").order("name"),
      fetchDriversForDesk(supabase),
    ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Network queue</h1>
        <p className="text-sm text-[var(--muted)]">
          Combined live view. Transitions are sent as actor_role=admin (must
          match your profile). Buttons follow dispatcher rules.
        </p>
      </div>
      {driversPack.error && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200">
          <strong>Driver list error (not loosening RLS):</strong> {driversPack.error}
        </div>
      )}
      {driversPack.drivers.length === 0 && !driversPack.error && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          No drivers rows returned. Confirm staff accounts exist in the <code>drivers</code> table.
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
        hospitals={hospitalsRes.data ?? []}
        drivers={driversPack.drivers}
      />
    </AppShell>
  );
}