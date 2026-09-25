import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export default async function DispatcherPage() {
  const { supabase, profile } = await requireProfile("dispatcher");
  const [requests, rules, hospitalsRes] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "dispatcher"),
    supabase.from("hospitals").select("id, name").order("name"),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Active emergency requests</h1>
        <p className="text-sm text-[var(--muted)]">
          Status buttons come from emergency_transition_rules — the frontend
          does not hardcode the state machine.
        </p>
      </div>
      <RequestBoard
        requests={requests}
        rules={rules}
        actorRole="dispatcher"
        hospitals={hospitalsRes.data ?? []}
      />
    </AppShell>
  );
}
