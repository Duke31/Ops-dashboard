import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DispatcherPage() {
  const { supabase, profile } = await requireProfile("dispatcher");
  const [requests, rules, hospitalsRes, driversRes] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "dispatcher"),
    supabase
      .from("hospitals")
      .select("id, name, available_capacity")
      .order("name")
      .then(
        (res) => res,
        () => ({ data: [] as { id: string; name: string; available_capacity: number | null }[], error: null, count: null, status: 200, statusText: "OK" }),
      ),
    supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .order("display_name")
      .then(
        (res) => res,
        () => ({ data: [] as { id: string; display_name: string; vehicle_label: string | null; hospital_id: string | null; active: boolean }[], error: null, count: null, status: 200, statusText: "OK" }),
      ),
  ]);

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
      <LogEmergencyForm />
      <RequestBoard
        requests={requests}
        rules={rules}
        actorRole="dispatcher"
        hospitals={hospitalsRes.data ?? []}
        drivers={driversRes.data ?? []}
      />
    </AppShell>
  );
}
