import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile("admin");
  const [requests, dispatcherRules, hospitalRules] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }),
    fetchTransitionRules(supabase, "dispatcher"),
    fetchTransitionRules(supabase, "hospital"),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Network queue</h1>
        <p className="text-sm text-[var(--muted)]">
          Combined live view. Transitions use the dispatcher rule set unless
          you act from a hospital screen.
        </p>
      </div>
      <RequestBoard
        requests={requests}
        rules={[...dispatcherRules, ...hospitalRules]}
        actorRole="dispatcher"
      />
    </AppShell>
  );
}
