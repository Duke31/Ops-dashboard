import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export default async function DispatcherPage() {
  const { supabase, profile } = await requireProfile("dispatcher");
  const [requests, rules, hospitalsRes, driversRes] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "dispatcher"),
    supabase.from("hospitals").select("id, name").order("name"),
    supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .eq("active", true)
      .order("display_name"),
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
